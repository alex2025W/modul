## Описание папки

Эта папка нужна для хранения docker-compose.yaml который описывает разворачивание
сервисов для локального dev окружения.

## Установка

### Linux

Шаги с 1 по 5 включительно можно выполнить, запустив скрипт deploy/local/install.sh

1. Установить необходимые библиотеки:
    * ```sudo apt-get install ca-certificates gnupg lsb-release git python2 xclip python2-dev```
2. Установить pip для python2:
    * ```curl https://bootstrap.pypa.io/pip/2.7/get-pip.py -o get-pip.py```
    * ```python2 get-pip.py```
    * ```sudo ln -s /home/$USER/.local/bin/pip /usr/local/bin/pip```
    * ```rm get-pip.py```
3. Установить пакетный менеджер pipenv:
    * ```pip install --user pipenv```
    * ```sudo ln -s /home/itkey/.local/bin/pipenv /usr/local/bin/pipenv```
4. Установить docker-compose:
    * ```sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose```
    * ```sudo chmod +x /usr/local/bin/docker-compose```
5. Установить Docker:
    * ```curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg```
    * ```echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null```
    * ```sudo apt-get update && sudo apt-get install docker-ce docker-ce-cli containerd.io```
    * ```sudo usermod -aG docker $USER```
    * ```newgrp docker```
6. Сгенерировать ssh ключ:
    * ```ssh-keygen -t rsa```
7. Скопировать публичную часть ключа:
    * ```cat ~/.ssh/id_rsa.pub | xclip -sel clip```
8. Добавить ключ в параметрах своего пользователя на bitbucket: https://bitbucket.org/account/settings/ssh-keys/
9. Клонировать код проекта:
    * ```git clone git@bitbucket.org:modul/int.git```
10. Перейти в каталог проекта:
    * ```cd int```
11. Установить зависимости проекта:
    * ```pipenv install```
12. Скопировать дамп базы данных в каталог deploy/mongo/db (дамп попросите в dev-чате)
    * ```cp <PATH_TO_FILE.dump> <PROJECT_ROOT>/deploy/mongo/db```
13. Скопировать SSL ключи в каталог deploy/nginx/ssl (ключи попросите в dev-чате)
    * ```cp <PATH_TO_FILE.key> <PROJECT_ROOT>/deploy/nginx/ssl/www.modul.org.key```
    * ```cp <PATH_TO_FILE.pem> <PROJECT_ROOT>/deploy/nginx/ssl/www.modul.org.pem```
14. Запустить окружение в ```docker-compose```:
    * ```cd <PROJECT_ROOT>/deploy/local```
    * ```docker-compose up```
15. Перейти в shell docker-контейнера mongodb:
    * ```sudo docker exec -it itkey-mongo /bin/bash```
16. Импортировать дамп базы данных:
    * ```mongorestore -u root -p example --authenticationDatabase admin --archive=/data/db/<DB_DUMP_FILE>.dump --db int```
17. Создать пользователя базы данных "int"
    * ```mongo admin -u root -p example```
    * ```use int```
    * ```db.createUser( { user: "modul", pwd: "test_123456", roles: [ { role: "readWrite", db: "int" } ] } )```
18. Скопировать .env_local файл в корень проекта и переименовать его в .env:
    * ```cp <PROJECT_ROOT>/config/.local.env <PROJECT_ROOT>/.env```
19. Настроить резолвинг служебных доменов. Для этого нужно добавить в файл hosts:
    * ```127.0.0.1 dev-local.modul.org```
    * ```127.0.0.1 redis```
    * ```127.0.0.1 mongo```

Установка локального dev окружения завершена.

### Отладка

###### Pycharm

1. Настроить интерпретатор на работу с виртуальным окружением
2. В параметрах отладки настроить считывание переменных окружения из файла ```<PROJECT_ROOT>/.env```

### Запуск CRM

Для полноценной работы CRM нужно выполнить следующие команды:

1. ```pipenv shell # активировать виртуальное окружение```
2. ```python2 <PROJECT_ROOT>/web.py```
3. ```python2 <PROJECT_ROOT>/worker.py```
4. ```python2 <PROJECT_ROOT>/worker_default.py```
5. ```python2 <PROJECT_ROOT>/worker_low.py```
6. ```python2 <PROJECT_ROOT>/worker_high.py```

Note: каждая команда должна быть запущена в виртуальном окружении проекта.

### Авторизация в CRM

1. Сообщить свой рабочий email в dev чате для того, чтобы его добавили в белый список
2. Выполнить скрипт создания администратора:
   * ```pipenv shell # активировать виртуальное окружение```
   * ```python2 <PROJECT_ROOT>/bin/create_admin_user.py --email <EMAIL> --fio "<USERNAME>"```
3. Авторизоваться, используя метод "Вход через корпоративный аккаунт"

### База данных

###### Скачать дамп базы:

1. Зайти в shell контейнера:

   * ```docker exec -it mongo bash```
   
2. Создать дамп базы:

   * ```mongodump -u <USERNAME> -p <PASSWORD> --authenticationDatabase=admin --db=int --gzip --archive=/data/db/int-<DATE>.dump.gz``` 
   
3. Скачать дамп:

   * ```mv /opt/modul/crm/mongo/db/int-<DATE>.dump.gz ~/```
   * ```rsync root@<TEST-STAND-HOST>:~/int-<DATE>.dump.gz /tmp```

###### Восстановление дампа

```mongorestore -u <USERNAME> -p <PASSWORD> --authenticationDatabase=admin --db=int --gzip --archive=/data/db/int-<DATE>.dump.gz```