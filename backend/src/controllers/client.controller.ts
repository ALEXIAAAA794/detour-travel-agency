import type { NextFunction, Request, Response } from "express";
import { clientService } from "../services/client.service.js";

type Handler = (req: Request, res: Response) => Promise<unknown>;

const wrap = (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export const clientController = {
  list: wrap(async (_req, res) => {
    res.json(await clientService.list());
  }),
};
