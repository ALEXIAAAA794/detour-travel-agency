import http.cookiejar
import json
import threading
import unittest
import unittest.mock
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener

import auth
import app as app_module
from app import Handler


class ManagerAccessTests(unittest.TestCase):
    def setUp(self):
        self.manager = {
            "id": 1,
            "name": "Alice Martin",
            "firstName": "Alice",
            "identifier": "manager-01",
        }
        self.patches = [
            unittest.mock.patch.object(auth, "init_auth_db"),
            unittest.mock.patch.object(
                auth,
                "authenticate",
                side_effect=lambda identifier, password: self.manager
                if identifier == "manager-01" and password == "motdepasse-test-123"
                else None,
            ),
            unittest.mock.patch.object(
                auth, "create_session", return_value="test-manager-session"
            ),
            unittest.mock.patch.object(
                auth,
                "get_session",
                side_effect=lambda token: self.manager
                if token == "test-manager-session"
                else None,
            ),
            unittest.mock.patch.object(auth, "delete_session"),
        ]
        for patcher in self.patches:
            patcher.start()
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever)
        self.thread.start()
        self.base_url = "http://127.0.0.1:%s" % self.server.server_port

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        for patcher in reversed(self.patches):
            patcher.stop()

    def request(self, path, method="GET", body=None, opener=None):
        headers = {}
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8") if isinstance(body, dict) else body
            headers["Content-Type"] = (
                "application/json" if isinstance(body, dict)
                else "application/x-www-form-urlencoded"
            )
        request = Request(
            self.base_url + path,
            data=data,
            headers=headers,
            method=method,
        )
        try:
            response = (opener or build_opener()).open(request)
            return response.status, response.headers, response.read()
        except HTTPError as error:
            result = error.code, error.headers, error.read()
            error.close()
            return result

    def test_backoffice_pages_and_actions_require_manager_session(self):
        for path in ("/", "/demandes", "/catalogue", "/reservations"):
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 401)

        status, _, _ = self.request(
            "/confirmer", method="POST", body=b"option_id=1&approval=test"
        )
        self.assertEqual(status, 401)
        self.assertEqual(self.request("/manager-api/requests")[0], 401)
        self.assertEqual(self.request("/manager-api/clients")[0], 401)
        self.assertEqual(self.request("/manager-api/appointments")[0], 401)
        self.assertEqual(self.request("/manager-api/reviews")[0], 401)

    def test_authenticated_manager_can_read_request_dashboard_proxy(self):
        opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        status, _, _ = self.request(
            "/auth/login",
            method="POST",
            body={
                "identifier": "manager-01",
                "password": "motdepasse-test-123",
            },
            opener=opener,
        )
        self.assertEqual(status, 200)
        proxy_patch = unittest.mock.patch.object(
            app_module,
            "manager_api",
            return_value=({"appointments": []}, 200),
        )
        with proxy_patch:
            status, _, body = self.request("/manager-api/appointments", opener=opener)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"appointments": []})

    def test_authenticated_manager_can_review_moderation_proxy(self):
        opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.request(
            "/auth/login",
            method="POST",
            body={
                "identifier": "manager-01",
                "password": "motdepasse-test-123",
            },
            opener=opener,
        )
        proxy_patch = unittest.mock.patch.object(
            app_module,
            "manager_api",
            return_value=({"reviews": []}, 200),
        )
        with proxy_patch as manager_api:
            status, _, body = self.request("/manager-api/reviews", opener=opener)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"reviews": []})
        manager_api.assert_called_once_with("GET", "/api/reviews/manager", None)

    def test_authenticated_manager_can_read_client_proxy(self):
        opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.request(
            "/auth/login",
            method="POST",
            body={
                "identifier": "manager-01",
                "password": "motdepasse-test-123",
            },
            opener=opener,
        )
        with unittest.mock.patch.object(
            app_module,
            "manager_api",
            return_value=([{"email": "client@example.com"}], 200),
        ) as manager_api:
            status, _, body = self.request("/manager-api/clients", opener=opener)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), [{"email": "client@example.com"}])
        manager_api.assert_called_once_with("GET", "/api/clients", None)

    def test_valid_manager_login_opens_backoffice(self):
        opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        status, _, body = self.request(
            "/auth/login",
            method="POST",
            body={
                "identifier": "manager-01",
                "password": "motdepasse-test-123",
            },
            opener=opener,
        )
        self.assertEqual(status, 200)
        manager = json.loads(body)["manager"]
        self.assertEqual(manager["firstName"], "Alice")
        self.assertEqual(self.request("/", opener=opener)[0], 200)


if __name__ == "__main__":
    unittest.main()
