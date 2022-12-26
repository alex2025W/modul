<!doctype html>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!--common css-->
        <link href="/static/css/bootstrap-notify.css?v={{version}}" rel="stylesheet" media="screen, print">
        <link href="/static/css/jquery.jgrowl.css?v={{version}}" rel="stylesheet" media="screen, print">
        <link href="/static/bootstrap/css/bootstrap.min.css?v={{version}}" rel="stylesheet" media="screen, print">
        <link href="/static/css/slider.css?v={{version}}" rel="stylesheet" media="screen, print">
        <link href="/static/css/token-input.css?v={{version}}" rel="stylesheet" media="screen, print">
        <link href="/static/css/bootstrap-editable.css?v={{version}}" rel="stylesheet" media="screen, print">
        <link href="/static/css/datepicker.css?v={{version}}" rel="stylesheet" media="screen, print">
        <!--<link href="/static/css/daterangepicker-bs2.css?v={{version}}" rel="stylesheet" media="screen, print">-->
        <link href="/static/css/daterangepicker2.css?v={{version}}" rel="stylesheet" media="screen, print">
        <link href="/static/css/select2.css?v={{version}}" rel="stylesheet" media="screen, print">
        <link href="/static/css/print.css?v={{version}}" rel="stylesheet" media="print">
        <link href="/static/css/font-awesome.min.css?v={{version}}" rel="stylesheet" media="screen, print">
        <link href="/static/css/bootstrap-multiselect.css?v={{version}}" rel="stylesheet" media="screen, print">
        <link href="/static/css/bootstrap-multiselect.css?v={{version}}" rel="stylesheet" media="screen, print">
        <link rel="shortcut icon" href="/static/img/fav.png">
        <!--main css-->
        <link href="/static/css/main.css?v={{version}}7" rel="stylesheet" media="screen, print">
        <!--scripts-->
        <script src="/static/scripts/routine.js?v={{version}}"></script>
        <!--<script src="/static/scripts/libs/jquery-1.9.1.js?v={{version}}"></script>-->
        <script src="/frontend/libs/jquery-1.12.4.js?v={{version}}"></script>
        <script src="/static/scripts/libs/jquery.json-2.4.js?v={{version}}"></script>
        <script src="/static/bootstrap/js/bootstrap.min.js?v={{version}}"></script>
        <script src="/static/scripts/libs/bootstrap-notify.js?v={{version}}"></script>
        <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
        <script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
        <script src="/static/scripts/libs/underscore.js?v={{version}}"></script>
        <script src="/static/scripts/libs/backbone.js?v={{version}}"></script>
        <script src="/static/scripts/libs/backbone.model.reset.js?v={{version}}"></script>
        <script src="/static/scripts/libs/myrouter.js?v={{version}}"></script>
        <script src="/static/scripts/libs/jquery.blockUI.js?v={{version}}"></script>
        <!---->
        <script src="/static/scripts/libs/base64.js?v={{version}}"></script>
        <script src="/static/scripts/libs/b64.js?v={{version}}"></script>
        <script src="/static/scripts/libs/rawdeflate.js?v={{version}}"></script>
        <script src="/static/scripts/libs/rawinflate.js?v={{version}}"></script>
        <!---->
        <script>
            MANAGER = '{{current_user['email']}}';
            MANAGER_ID = '{{current_user['_id']}}';
            VERSION = '{{version}}';
            %if (current_user['admin']=='admin'):
                MA = true;
            %else:
                MA = false;
            %end
            $.ajaxSetup({timeout:50000});
            $.jGrowl.defaults.closer = false;
            $(document).on('click', '.show-error', function(){
                $.blockUI({
                    css: {
                        width: 800 + "px",
                        'margin-left': '-100px',
                        top: '10%',
                    },
                    message: $('#error-dialog') });
                $(document).off('focusin.modal');
            });
            $(document).on('click', '.close-error-dlg', function(){$.unblockUI();});
            $(document).on('click', '.send-error', function(){
                $.unblockUI();
                $.post('/handlers/send_error', {msg: $('.error-text', '#error-dialog').html()+'<br>Пояснение:'+$('#error-textarea').val()});
            });

            // определить уровень доступа для пользователя к странице
            function has_access(page_key,access){
                if(glCurUser.admin=='admin')
                    return true;
                for(var r=0;r<glCurUser.roles.length;++r){
                    var role = glCurUser.roles[r];
                    for(var p in role.pages){
                        if(p==page_key)
                            if(role.pages[p][access])
                                return true;
                    }
                }
                return false;
            }

            function showmsg(message, sticky, beforeClose, key, msg_type){
                if(typeof msg_type === 'undefined' || !msg_type)
                    msg_type = 'error';

                sticky = typeof sticky !== 'undefined' ? sticky : false;
                beforeClose = typeof beforeClose !== 'undefined' ? beforeClose : function(){};
                $.jGrowl(message, {'themeState':((msg_type=='error')?'growl-error':'growl-success'), 'sticky':sticky, 'beforeClose':beforeClose, 'position': 'bottom-right'});

                $("body").popover({
                    selector: '[data-toggle="popover"]',
                    placement:'top-left',
                    html : true,
                    width:'600px',
                });
            }
            function show_error(title){
                $.jGrowl(title, {'themeState':'growl-fault', 'sticky':true, 'position': 'bottom-right'});
            }
            $(document).ajaxError(function(event, jqxhr, settings, exception) {
                if(settings.suppressErrors  || jqxhr.status == 0) {
                        return;
                }
                if (jqxhr.status == 401) {
                    window.location = '/login';
                }
                else{
                    try{
                        var err = $.parseJSON(jqxhr.responseText);
                        if (!err || err == 'undefined')
                            showmsg('Ошибка доступа к серверу. Возможно у вас отсутствует подключение к сети интернет.');
                        else if (err.error == 'server_error')
                            showmsg('Ошибка доступа к базе данных. Возможно у вас отсутствует подключение к сети интернет.');
                        else
                            showmsg(err.error);
                    }
                    catch(err){
                        $.unblockUI();
                        var msg = jqxhr.responseText.substr(jqxhr.responseText.indexOf('<body>')+6, jqxhr.responseText.indexOf('</body>'));
                        if (msg == ''){
                            msg = 'Нет доступа к серверу';
                        }
                        msg = 'Ошибка на странице: '+ window.location + '<br>' + msg;
                        $('.error-text', '#error-dialog').html(msg);
                        show_error('Ошибка сервера!<br/><a href="javascript:;" class="show-error" style = "color:#ff0;">Отправить разработчикам.</a>');
                    }
                }
            });

            $(function(){
                // получаем сообщения для текущего пользователя
                $.get('/handlers/msg', {}, 'json');
            });
        </script>
        <script type="text/javascript">
            var glCurUser = {'defaultpage': "{{! current_user['defaultpage'] }}", 'inner_phone': "{{ current_user.get('inner_phone','') }}", 'admin': "{{ current_user['admin'] }}", 'roles': {{! str(current_user['roles']).replace("u'","'").replace("True","true") }} };
        </script>

        <style>
            #main-header{
                margin-bottom: 10px;
            }
        </style>
    <title>{{!page_title}}. INT. Модуль</title>
    </head>
    <body>
    <table id = "main-header">
            <tr>
                <td class="logo-box"><div class="logo">&nbsp;</div></td>
                <td class="user-menu user-profile">
                    <div class="large-menu">
                        %for p in menu:
                            <div class="dropdown" >
                                <i class="close-mobile fa fa-close" aria-hidden="true"></i>
                                <a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
                                     {{ p['group'] }}
                                     <span class="caret"></span>
                                </a>
                                <ul class="dropdown-menu" role="menu" aria-labelledby="dLabel">
                                    %for item in p['items']:
                                        <li><a href = "{{item['url']}}">{{ item['name'] }}</a></li>
                                    %end
                                </ul>
                            </div>
                        %end
                    </div>
                    <div class="small-menu">
                        <div class="dropdown" >
                            <a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
                                 <i class="fa fa-navicon" aria-hidden="true"></i>
                                 <span class="not-for-mobile">
                                    Выберите раздел
                                 </span>
                            </a>
                            <ul class="dropdown-menu" role="menu" aria-labelledby="dLabel">
                                <i class="close-mobile fa fa-close" aria-hidden="true"></i>
                                %for p in menu:
                                    %for item in p['items']:
                                        <li><a href = "{{item['url']}}">{{ p['group'] }}.{{ item['name'] }}</a></li>
                                    %end
                                %end
                            </ul>
                        </div>
                    </div>
                    <div class="dropdown" style = "float: right;">
                        <a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
                            <i class="fa fa-user" aria-hidden="true"></i>
                            <span class="not-for-mobile">
                               {{ current_user['fio'] if 'fio' in current_user and current_user['fio']!="" else current_user['email'] }}
                            </span>
                        </a>
                        <ul class="dropdown-menu" role="menu" aria-labelledby="dLabel">
                            <i class="close-mobile fa fa-close" aria-hidden="true"></i>
                            <li><a href = "/logout">Выйти</a></li>
                        </ul>
                    </div>
                </td>
            </tr>
        </table>
        <div class="page-title">{{!page_title}}</div>
        <!--main data container-->
        <div class="container1" id="wrapper" style = "width:100%;">
            <div class="wr1" style = "width:97%; min-width:1000px; box-sizing: border-box; padding: 10px;">
                <div class="row" id="content">
                    %include
                </div>
            </div>
        </div>
        <!--notification panel-->
        <div class="notifications top-right"></div>
        <!--include scripts-->
        %scripts()
        <!-- error dialog template-->
        <div id="error-dialog" style="display:none;">
            <div class="error-header">Ошибка сервера</div>
            <div class="error-text"></div>
            <div class="error-message"><p><br><label>Пояснение:<br><textarea style="width:96%;" rows="5" id="error-textarea"></textarea></label></p></div>
            <div class="error-footer">
                <a href="javascript:;" class="btn close-error-dlg">Закрыть</a>
                <a href="javascript:;" class="btn send-error btn-info">Отправить разработчикам</a>
            </div>
        </div>
        <!---->
    </body>
</html>
