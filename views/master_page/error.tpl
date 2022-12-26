<!doctype html>
<html>
    <head>
        <meta charset="UTF-8">
        <!--common css-->
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="shortcut icon" href="/static/img/fav.png">
        <link href="/static/bootstrap/css/bootstrap.min.css?v={{version}}" rel="stylesheet" media="screen, print">
        <!--main css-->
        <link href="/static/css/main.css?v={{version}}7" rel="stylesheet" media="screen, print">
        <!--scripts-->
        <script src="/static/scripts/routine.js?v={{version}}"></script>
        <script src="/static/scripts/libs/jquery-1.9.1.js?v={{version}}"></script>
        <script src="/static/bootstrap/js/bootstrap.min.js?v={{version}}"></script>
        <script src="/static/scripts/libs/underscore.js?v={{version}}"></script>
        <script src="/static/scripts/libs/backbone.js?v={{version}}"></script>
        <script src="/static/scripts/libs/jquery.blockUI.js?v={{version}}"></script>
        <title>{{!page_title}}. INT. Модуль</title>
    </head>
    <body>
        %if current_user:
            <table id = "main-header">
                <tr>
                    <td class="logo-box"><div class="logo">&nbsp;</div></td>
                    <td class="user-menu">
                        <div class="large-menu">
                            %for p in menu:
                                <div class="dropdown" >
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
                                     Выберите раздел
                                     <span class="caret"></span>
                                </a>
                                <ul class="dropdown-menu" role="menu" aria-labelledby="dLabel">
                                    %for p in menu:
                                        %for item in p['items']:
                                            <li><a href = "{{item['url']}}">{{ p['group'] }}.{{ item['name'] }}</a></li>
                                        %end
                                    %end
                                </ul>
                            </div>
                        </div>
                    </td>
                    <td class="user-profile">
                        <div class="dropdown" style = "float: right;">
                            <a class="btn dropdown-toggle" data-toggle="dropdown" href="#">
                                <i class="fa fa-user" aria-hidden="true"></i>
                                 {{ current_user['fio'] if 'fio' in current_user and current_user['fio']!="" else current_user['email'] }}
                                 <span class="caret"></span>
                            </a>
                            <ul class="dropdown-menu" role="menu" aria-labelledby="dLabel">
                                <li><a href = "/logout">Выйти</a></li>
                            </ul>
                        </div>
                    </td>
                </tr>
            </table>
        %end
        <div class="page-title">{{!page_title}}</div>
        <!--main data container-->
        <div class="container1" id="wrapper">
            <div class="wr1">
                <div class="row" id="content">
                    %include
                </div>
            </div>
        </div>
        <!--include scripts-->
        %scripts()
    </body>
</html>
