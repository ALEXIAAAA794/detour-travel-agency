function checkForm(f) {
  if (f.nom.value == "" || f.email.value == "" || f.date.value == "") {
    alert("Merci de remplir tous les champs obligatoires (*)");
    return false;
  }
  if (f.email.value.indexOf("@") == -1) {
    alert("Adresse e-mail invalide !");
    return false;
  }
  alert("Merci ! Votre demande va s'ouvrir dans votre logiciel de messagerie.");
  return true;
}

$(document).ready(function() {
  var slides = $("#slider .slide");
  var current = 0;
  if (slides.length) {
    slides.each(function(i) {
      $("#slider .pager").append("<span data-i='" + i + "'></span>");
    });
    var show = function(i) {
      slides.eq(current).fadeOut(800);
      slides.eq(i).fadeIn(800);
      $("#slider .pager span").removeClass("on").eq(i).addClass("on");
      current = i;
    };
    slides.eq(0).show();
    $("#slider .pager span").eq(0).addClass("on");
    var timer = setInterval(function() { show((current + 1) % slides.length); }, 5000);
    $("#slider .pager span").click(function() {
      clearInterval(timer);
      if ($(this).data("i") != current) show($(this).data("i"));
    });
  }

  $(window).scroll(function() {
    if ($(this).scrollTop() > 200) $("#totop").fadeIn(); else $("#totop").fadeOut();
  });
  $("#totop").click(function() {
    $("html, body").animate({ scrollTop: 0 }, 600);
    return false;
  });

  if (document.cookie.indexOf("cookies_ok=1") == -1) $("#cookies").show();
  $("#cookies a").click(function() {
    document.cookie = "cookies_ok=1; path=/; max-age=31536000";
    $("#cookies").slideUp();
    return false;
  });

  $(".box").hover(function() {
    $(this).stop().animate({ marginTop: "-5px" }, 200);
  }, function() {
    $(this).stop().animate({ marginTop: "0" }, 200);
  });
});
