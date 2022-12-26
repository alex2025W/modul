### CRM

Проект представляет из себя систему управления взаимоотношениями с клиентами.

### Разворачивание локального окружения

Установка проекта описана в [разделе](deploy/local/readme.md) деплоймента локального окружения.

### Сборка JS

Перед сборкой нужно установить зависимости:

1. Установить NVM - https://github.com/nvm-sh/nvm
2. ```nvm install '8.17.0' # установить нужную версию Node.js```
3. ```cd <PROJECT_ROOT> # перейти в корень проекта```
4. ```npm i # установить зависимости```

Сборка модулей осуществляется из корневой папки проекта

1. Установите зависимости
   * ```npm install```
2. Собрать модуль (build), режим разработки (watch), debug:

   * **CRM (/static/scripts/crm/)**

      * ```npm run crm:build``` - сборка

   * **Timeline (/static/scripts/timeline)**

      * ```npm run timeline:build``` - сборка
      * ```npm run timeline:watch``` - режим разработки
      * ```npm run timeline:debug``` - отладка

   * **Contracts Outgoing (/static/scripts/report/)**

      * ```npm run contratcs_outgoing``` - сборка

   * **Contracts Incoming (/static/scripts/incoming/)**

      * ```npm run contratcs_incoming``` - сборка