//
// Класс обработки очередей
//
var Queue = function(){
    this.init.apply ( this, arguments );
};
Queue.prototype = {
    /**
    * Инициализация объекта
    */
   init: function  (  ) {
      var optns = arguments[0] || {};
      this.queue_key = optns.queue_key || "";   // идентификатор очереди очереди
      this.task_key = optns.task_key || "";            // ключ задания
      this.params = optns.params || {};                 // параметры для выполнения задания очереди
      this.complete = optns.complete || null;       // функция вызываемая по окончании операций очереди
   },

    /**
    * Запуск на исполнение задания
    **/
    run: function(zip_level)
    {
       var self = this;
        if(!this.task_key)
            $.jGrowl('Ошибка! Не заданы параметры для выполнения операции. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
        if(zip_level)
            var zipped_data =base64js.fromByteArray(RawDeflate.deflate(Base64.utob(JSON.stringify(this.params)),3));
        else
            var zipped_data =base64js.fromByteArray(RawDeflate.deflate(Base64.utob(JSON.stringify(this.params))));
        $.ajax({
                type: "POST",
                url: "/handlers/queue/add_in_queue/"+self.task_key,
                data:  {'data': zipped_data},
                timeout: 250000,
                contentType: "application/json; charset=utf-8",
                dataType: 'json',
                async:true
        }).done(function(result) {
                // запуск таймера на проверку результата очереди
                if(result['status']=="ok")
                {
                    // фиксирование ключа очереди
                    self.queue_key = result['key'];
                    self.check();
                }
                else
                    self.complete(self, self.task_key, {'status': 'error', 'msg': result['msg']});
        }).error(function(){
                    // если ошибка и не был задан уровень сжатия, то задаем уровень сжатия и пробуем еще раз
                    if(!zip_level){
                        self.run(3);
                        return;
                    }
                    self.complete(self, self.task_key, {'status': 'error', 'msg': 'Ошибка обработки данных. Повторите попытку.'});
        }).always(function(){});
    },

    /**
    * Проверка статуса по ключу задания
    **/
    check: function()
    {
        var self = this;
        if(self.queue_key)
        {
               $.ajax({
                    type: "GET",
                    url: "/handlers/queue/check_status/" + self.queue_key,
                    data: {},
                    timeout: 20000,
                    contentType: 'application/json',
                    dataType: 'json',
                    async:true
            }).done(function(result) {
                    if(result['status']=="error")
                        self.complete(self, self.task_key, {'status': 'error', 'msg': 'Ошибка! ' + result['note']});
                    else if(result['status']=="in_progress")
                    {
                        Routine.showProgressLoader(result.percent_complete);
                        setTimeout(function(){self.check();},3000);
                    }
                    else if(!result['status'] || result['status'] =='ok' ||  result['status'] =='success')
                    {
                        // считаем что получили результат
                        self.complete(self, self.task_key, {'status': 'ok', 'data': result });
                    }
            }).error(function(){
                        self.complete(self, self.task_key, {'status': 'error', 'msg': 'Ошибка получения данных. Повторите попытку.'});
            }).always(function(){});
        }
        else
            self.complete(self, self.task_key, {'status': 'error', 'msg': 'Ошибка получения данных. Повторите попытку.'});
    }
};
