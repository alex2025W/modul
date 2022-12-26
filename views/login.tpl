<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="/static/bootstrap/css/bootstrap.min.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/login.css?v={{version}}1" rel="stylesheet" media="screen">
  <script src="/static/scripts/libs/jquery-1.9.1.js?v={{version}}"></script>
  <script src="/static/scripts/login.js?v={{version}}"></script>
  <title>Вход</title>
</head>
<body>
  <div class="container" id="wrapper">
  <div class="modal">
    <div class="line">
        <div class="logo"></div>
    </div>

  <div class="modal-header"  style = "margin-top:20px;">
    <h5><nobr>Вход через корпоративный аккаунт (@modul.org)</nobr></h5>
  </div>
  <div class = "line" style = "margin-bottom:30px;">
          <a class="btn btn-primary right-btn" href="{{ url }}">Войти</a>
  </div>

  <div class = "line" style = "margin-bottom:30px;">
    <span class="lnk lnk-additional" href=""  style = "margin-left:15px;">Другое</span>
  </div>

  <div class="modal-header pnl-inner-enter" style = "margin-top:60px; display: none;">
    <h5>Вход через внутренний аккаунт (@int.modul.org)</h5>
  </div>
  <div class="modal-body pnl-inner-enter" style = "display: none;">
    <form method="POST" id="login-form">
      % if error:
        <span class="error">
            {{ error }}
        </span>
      % end
      <div class="controls" >
        <label for="user-login">Email:</label><input type="text" id="user-login" name="user-login" value="{{ useremail }}" />
      </div>
      <div class="controls" >
        <label for="user-password">Пароль:</label><input type="password" id="user-password" name="user-password" onkeydown="if(event.keyCode==13) $('#login-form').submit();" />
      </div>
      <div class = "line">
          <a class="btn right-btn" style = "margin-right:25px;" href="javascript:($('#login-form').submit());" >Войти</a>
      </div>
    </form>
  </div>
</div>
  <script src="/static/scripts/libs/jquery-1.9.1.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.json-2.4.js?v={{version}}"></script>
  <script src="/static/bootstrap/js/bootstrap.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.blockUI.js?v={{version}}"></script>
  <script>
  </script>
</div>
</body>
</html>
