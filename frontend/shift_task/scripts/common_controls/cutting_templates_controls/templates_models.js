///
/// Модель элемента шаблона, используемого в расчетах
///
App.Models.TemplateModel = Backbone.Model.extend({
    defaults: {
        '_id': '',
        'name': '',
        // сколько раз нужно выполнить шаблон, чтобы изготовить все что требуется по заданию
        'qty': 0,
        // исходный материал для шаблона
        'in_object': null,
         // результат раскроя
        'out_objects': [],
        'sector_id': '',
        'sector_name': 'Не задан',
        'sector_routine': 0,
        // если входящий материал данного шаблона получается из других теплейтов
        'linked_templates': [],
        //  рассчитываемый праметр, указывает кого применили для получения результата текущего шаблона
        'used_templates': [],
        // для каких шаблонов из каких заданий данный шаблон уже применен
        'applied_to': [],
        // поле по которому сортируются шаблоны
        'routine': 0,
        // список сменных заданий в которых был применен шаблон
        // 'shift_tasks': [],
         // объем который вносит пользователь на форме
        'count': 0,
         // сколько раз данный шаблон был применен
        'fact_count': 0,
        // сколько шаблон использован в других шаблонах
        'applied_count': 0,
    },
     initialize: function (options) {
         this.constructor.__super__.initialize.apply(this, options);
         this.on('change:count', this.change_count, this);
    },

    /**
     ** Функция поиска шаблона по входящему объекту
     ** На выходе список шаблонов, которые на вход получают указанное изделие
    **/
    find_templates_by_in_object: function(all_templates, in_object_id)
    {
        // поиск всех шаблонов,  которые производят требуемый иходный материал
        return all_templates.models.filter(function (item) {
            if(item.get('in_object')['_id'] ==in_object_id)
                return true;
            return false;
        });
    },

    /**
    ** Функция поиска шаблона по выходящему объекту
    ** На выхооде список шаблонов, выпускающие заданное изделие
    **/
    find_templates_in_out_objects: function(all_templates, in_object)
    {
        // поиск всех шаблонов,  которые производят требуемый иходный материал
        return all_templates.models.filter(function (item) {
            for(var i in item.get('out_objects'))
                if(item.get('out_objects')[i]['_id'] == in_object['_id'])
                    return true;
            return false;
        });
    },

    /**
     ** Функция поиска шаблонов по списку входящих объектов
     ** На выходе список идентификаторов объектов
    **/
    find_templates_by_in_objects: function(all_templates, in_objects_ids)
    {
        var result= {};
        for(var i in in_objects_ids)
        {
            var in_object_id = in_objects_ids[i];
            _.each(all_templates.models, function (item) {
                if(item.get('in_object')['_id'] == in_object_id)
                    result[item.get('_id')] = item;
            });
        }
        return _.values(result);
    },

    /**
     ** функция поиска шаблона по выходящему объекту
     ** На выхооде список шаблонов, выпускающие заданное изделие
    **/
    find_templates_in_out_objects: function(all_templates, in_object)
    {
        // поиск всех шаблонов,  которые производят требуемый иходный материал
        return all_templates.models.filter(function (item) {
            for(var i in item.get('out_objects'))
                if(item.get('out_objects')[i]['_id'] == in_object['_id'])
                    return true;
            return false;
        });
    },

    /**
     ** функция получения всех уникальных выходящих объектов
     ** со всех поданных на вход шаблонов
    **/
    templates_get_out_objects: function(templates){
        var result = {};
        _.each(templates, function (template) {
            _.each(template.get('out_objects'), function (out_object) {
                result[out_object['_id']] = out_object['_id'];
            });
        });
        return _.keys(result);
    },

    // Получение шаблона по его ID
    get_template_by_id: function(template_id){
        for(var i in this.collection.models)
        {
            var model = this.collection.models[i];
            if(model.get('_id') == template_id)
                return model;
        }
    },

    /**
    ** Функция расчета, в каких шаблонах данынй шаблон применяется
    ** Результат - список объектов: {'_id': 'template_id', 'count': 2}
    **/
    calculate_applied_to_template:function(templates, src_template){
        var self = this;
        var result = [].concat(src_template.get('applied_to'));
        var full_count = 0;
         _.each(templates.models, function (template) {
            _.each(template.get('used_templates'), function (used_template) {
                if(used_template['_id'] == src_template.get('_id'))
                {
                    result.push({
                            '_id':template.get('_id'),
                            'name':template.get('name'),
                            'count':template.get('count')
                    });
                }
            });
        });
         _.each(result, function (template) {
            full_count+=template['count'];
         });
         return {'items': result, 'count': full_count}
    },

    /**
    ** Локальная функция расчета, сколько каких  шаблонов нужно применить, чтобы изготовить поданный на вход
    ** all_templates - все шаблоны
    ** template - входящий шаблон по которому нужно рассчиттать зависимости
    ** used_templates - шаблоны которые были применены и какое количество раз
    **/
    calculate_template:function(all_templates, src_template, used_templates){
        var self = this;
        // требуемый по шаблону объем
        var need_count = src_template.get('count');
        var in_object = src_template.get('in_object');
        // обнуляем список шаблонов, которые использовали в получении текущего
        src_template.set('used_templates', [],{silent: true});

        // находим все шаблоны, которые могут изготовить входящий объект заданного шаблона
        var good_templates = this.find_templates_in_out_objects(all_templates, in_object);
        // пробиваем количество применений каждого из шаблона по умолчанию нулями
        _.each(good_templates, function (template) {
            if(!(template.get('_id') in used_templates))
            {
                var tmp = self.calculate_applied_to_template(all_templates, template);
                used_templates[template.get('_id')] = {
                    'template': template, // информация о шаблоне
                    'count':0, // сколько раз применили шаблон  в текущих расчетах
                    // сколько не зайдействованных применений шаблона в других шаблонах
                    // по сути это шаблоны выданные в задание, и не айдествованные еще в других шаблонах
                    'in_storage': Routine.strToInt(template.get('fact_count')) - tmp['count'],
                    // какие шаблоны  и в каком колчиестве используют данный шаблон
                    'applied_to': tmp['items']
                }
            }
        });
        // проходим по найденным шаблонам и пытаемся из них изгтовить заданный
        _.each(good_templates, function (template)
        {
            if(need_count>0)
            {
                // находим требуемый выходной элемент в шаблоне изготовителе
                var out_item = null;
                for(var i in template.get('out_objects'))
                    if(template.get('out_objects')[i]['_id'] == in_object['_id'])
                        out_item = template.get('out_objects')[i];

                 // балланс по текущему шаблону
                 var ballance = Routine.strToInt(template.get('qty'))- Routine.strToInt(template.get('fact_count'));
                 // сколько данного шаблона максимально можем применить в заданном
                 var max_tempate_count = (used_templates[template.get('_id')]['in_storage'] + ballance)- used_templates[template.get('_id')]['count'];
                 // var max_tempate_count = template.get('qty') - used_templates[template.get('_id')]['count'];

                // qty - сколько раз всего можно применить шаблон по плану
                // fact_count - сколько выдали данного шаблона в производство
                // applied_to - сколько задействовали шаблон в производстве других шаблонов ранее
                // count - сколько задействовли шаблон в текущих расчетах

                //*******************************************
                // qty == 2
                // fact_count == 1
                // applied_to = {0}
                // in_storage = 0
                // count = 0
                //1------------------------------------
                // =max_tempate_count = 2
                // applied_to = {1}
                // in_storage = 0
                // count = 0
                //2------------------------------------
                // =max_tempate_count = 1
                // applied_to = {1,1}
                // in_storage = 0
                // count = 1
                //*******************************************

                if(max_tempate_count>0)
                {
                    // рассчитываем сколько раз нужно применить шаблон для получения требуемого объема
                    // по сути чтобы применить данный шаблон столько то раз, перед этим надо применить вот этот шаблон столько-то раз
                    var apply_count = Math.ceil(need_count/Routine.strToFloat(out_item['count']));

                    // если число применений превышает максимально допустимое количество применеий, то применяем сколько можно и
                    // продолжаем просчет по остальным доступным шаблонам
                    if(apply_count>max_tempate_count)
                    {
                        //apply_count-=max_tempate_count;
                        need_count=(apply_count-max_tempate_count) * out_item['count'];
                        //  помечаем в результате кто будет сделан на базе текущего шаблона
                        used_templates[template.get('_id')]['applied_to'].push({
                            '_id': src_template.get('_id'),
                            'name': src_template.get('name'),
                            'count': apply_count * out_item['count'],
                        });
                        // помечаем кого задействуем для получения необходимого результата
                        src_template.get('used_templates').push({
                            '_id': template.get('_id'),
                            'count': max_tempate_count,
                            'name': template.get('name'),
                        });

                        //-------------------
                        if(used_templates[template.get('_id')]['in_storage']>0 && used_templates[template.get('_id')]['in_storage']>max_tempate_count)
                        {
                            used_templates[template.get('_id')]['in_storage']-=max_tempate_count;
                            max_tempate_count=0;
                        }
                        else if(used_templates[template.get('_id')]['in_storage']>0 )
                        {
                            max_tempate_count-=used_templates[template.get('_id')]['in_storage'];
                            used_templates[template.get('_id')]['in_storage']=0;
                        }
                        //-------------------
                        used_templates[template.get('_id')]['count']+=max_tempate_count;
                    }
                    else
                    {
                        //  помечаем в результате кто будет сделан на базе текущего шаблона
                        used_templates[template.get('_id')]['applied_to'].push({
                            '_id': src_template.get('_id'),
                            'name': src_template.get('name'),
                            'count': apply_count * out_item['count'],
                        });
                        // помечаем кого задействуем для получения необходимого результата
                        src_template.get('used_templates').push({
                            '_id': template.get('_id'),
                            'count': apply_count,
                            'name': template.get('name'),
                        });
                        //-------------------
                        if(used_templates[template.get('_id')]['in_storage']>0 && used_templates[template.get('_id')]['in_storage']>apply_count)
                        {
                            used_templates[template.get('_id')]['in_storage']-=apply_count;
                            apply_count = 0;
                        }
                        else if(used_templates[template.get('_id')]['in_storage']>0 )
                        {
                            apply_count -=used_templates[template.get('_id')]['in_storage'];
                            used_templates[template.get('_id')]['in_storage']=0;
                        }
                        //-------------------
                        used_templates[template.get('_id')]['count']+=apply_count;
                        // сбрасываем темповые параметры
                        apply_count = 0;
                        need_count = 0;
                    }
                }
            }
        });
    },

    /**
     **функция расчета сколько данного шаблона требуется
     ** в рамках всего расчета для других шаблонов
    **/
    calculate_template_need_volume:function(all_templates, template){
        var self = this;
        var result = 0;
        var result_used_templates = {};
        var tmp_templates_to_calculate = [];
        _.each(template.get('out_objects'), function (item) {
            tmp_templates_to_calculate = tmp_templates_to_calculate.concat(self.find_templates_by_in_object(all_templates, item['_id']));
        });

        // если шаблон служит материалов для других шаблонов
        if(tmp_templates_to_calculate.length>0)
        {
            _.each(tmp_templates_to_calculate, function (template) {
                self.calculate_template(all_templates, template, result_used_templates);
            });
            result = result_used_templates[template.get('_id')]['count'];
        }
        return result;
    },


    /**
    ** событие изменения объема темплейта
    **/
    change_count: function(e)
    {
        var self = this;
        /*try
        {
            var result = this.recalculate_templates(this.toJSON(), this.collection.toJSON());
            _.each(result, function(item){
                var model = self.get_template_by_id(item.template['_id']);
                model.set('count', item['count']);
            });
        }
        catch(err)
        {
            this.set('count', this.previous('count'));
            $.jGrowl(err.message, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        }*/

        try
        {
            var all_templates = this.collection;
            // надо получить сколько сейчас уже требуется данного шаблона для других шаблонов,
            // если вносимый объем больше, чем требуется то ничего страшного, если меньше то необходимо откатить его к предыдущему
            if(this.calculate_template_need_volume(all_templates, this)>this.get('count'))
            {
                throw new SyntaxError("Ошибка. Нельзя уменьшить объем данного шаблона. Данный шаблон используется в получении материала для других шаблонов. Проверьте данные и повторите попытку.");
            }

            // результирующих объект для хранения задействованных шаблонов
            var result_used_templates = {};
            // получение входящего объекта шаблона
            var in_object = this.get('in_object');
            // если исходный материал не покупно, то надо найти шаблон по которому он изготавливается
            // если шаблона нет, значит исходный материал изготавливается не по шаблону
            if(!('is_buy' in in_object) || !in_object['is_buy'])
            {
                // получем все шаблоны, которые могут изгтовить данный входящий объект
                // т.е имеют на выходе данный входящий объект
                var all_templates_who_can_make_in_object = this.find_templates_in_out_objects(all_templates, in_object);
                // из отобранных шаблонов собираем все выходящие объекты
                var all_out_objects_from_all_templates_who_can_make_in_object = this.templates_get_out_objects(all_templates_who_can_make_in_object);
                // находим все шаблоны, у которых на вход подается любое из найденных выходных изделий
                // т.е это те шаббоны, которые косвенно могут повлиять на шаблоны которые делают материал для текущих
                var tmp_templates_to_calculate = this.find_templates_by_in_objects(all_templates, all_out_objects_from_all_templates_who_can_make_in_object);


                // обнуляем в отобранных шаблонах информацию, о том какие шаблоны моги быть исользованы в качестве
                // материалов для отобранных
                _.each(tmp_templates_to_calculate, function (template) {
                     template.set('used_templates', [],{silent: true});
                 });

                _.each(tmp_templates_to_calculate, function (template) {
                    self.calculate_template(self.collection, template, result_used_templates);
                });
                _.each(result_used_templates, function(item){
                    item.template.set('count', item['count']);
                });
            }

        }
        catch(err)
        {
            this.set('count', this.previous('count'));
            $.jGrowl(err.message, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        }
    },

   /**
     ** пересчет шаблонов по измененному количеству
    **/
    /*recalculate_templates: function(cur_temlate, all_templates){
        // Локальная функция поиска шаблона по входящему объекту
        // На выходе список шаблонов, которые на вход получают указанное изделие
        function find_templates_by_in_object(all_templates, in_object_id)
        {
            // поиск всех шаблонов,  которые производят требуемый иходный материал
            return all_templates.filter(function (item) {
                if(item['in_object']['_id'] == in_object_id)
                    return true;
                return false;
            });
        }

        // Локальная функция поиска шаблонов по списку входящих объектов
        // На выходе список идентификаторов объектов
        function find_templates_by_in_objects(all_templates, in_objects_ids)
        {
            var result= {};
            for(var i in in_objects_ids)
            {
                var in_object_id = in_objects_ids[i];
                _.each(all_templates, function (item) {
                    if(item['in_object']['_id'] == in_object_id)
                        result[item['_id']] = item;
                });
            }
            return _.values(result);
        }

        // Локальная функция поиска шаблона по выходящему объекту
        // На выхооде список шаблонов, выпускающие заданное изделие
        function find_templates_in_out_objects(all_templates, in_object)
        {
            // поиск всех шаблонов,  которые производят требуемый иходный материал
            return all_templates.filter(function (item) {
                for(var i in item['out_objects'])
                    if(item['out_objects'][i]['_id'] == in_object['_id'])
                        return true;
                return false;
            });
        }

        // Локальная функция получения всех уникальных выходящих объектов
        // со всех поданных на вход шаблонов
        function templates_get_out_objects(templates){
            var result = {};
            _.each(templates, function (template) {
                _.each(template['out_objects'], function (out_object) {
                    result[out_object['_id']] = out_object['_id'];
                });
            });
            return _.keys(result);
        }

        // Локальная функция расчета, сколько каких  шаблонов нужно применить, чтобы изготовить поданный на вход
        // all_templates - все шаблоны
        // template - входящий шаблон по которому нужно рассчиттать зависимости
        // used_templates - шаблоны которые были применены и какое количество раз
        function calculate_template(all_templates, src_template, used_templates){
            // требуемый по шаблону объем
            var need_count = src_template['count'];
            var in_object = src_template['in_object'];
            // находим все шаблоны, которые могут изготовить входящий объект заданного шаблона
            var good_templates = find_templates_in_out_objects(all_templates, in_object);
            _.each(good_templates, function (template) {
                if(!(template['_id'] in used_templates))
                    used_templates[template['_id']] = {'template': template, 'count':0 }
            });
            _.each(good_templates, function (template) {
                if(need_count>0)
                {
                    var out_item = null;
                    for(var i in template['out_objects'])
                    {
                        if(template['out_objects'][i]['_id'] == in_object['_id'])
                        {
                            out_item = template['out_objects'][i];
                            break;
                        }
                    }

                    // максимальное число применений шаблона
                    var max_tempate_count = template['qty'] - used_templates[template['_id']]['count'];
                    if(max_tempate_count)
                    {
                        // рассчитываем сколько раз нужно применить шаблон для получения требуемого объема
                        var apply_count = Math.ceil(need_count/Routine.strToFloat(out_item['count']));
                        // если число применений превышает максимально допустимое количество применеий, то применяем сколько можно и
                        // продолжаем просчет по остальным доступным шаблонам
                        if(apply_count>max_tempate_count)
                        {
                            apply_count-=max_tempate_count;
                            need_count-=apply_count * out_item['count'];
                            used_templates[template['_id']]['count']+=max_tempate_count;
                        }
                        else
                        {
                            used_templates[template['_id']]['count']+=apply_count;
                            apply_count = 0;
                            need_count = 0;
                        }
                    }
                }
            });
        }

        // Локальная функция расчета сколько данного шаблона требуется
        // в рамках всего расчета для других шаблонов
        function calculate_template_need_volume(all_templates, template){
            var result = 0;
            var result_used_templates = {};
            var tmp_templates_to_calculate = [];
            _.each(template['out_objects'], function (item) {
                tmp_templates_to_calculate = tmp_templates_to_calculate.concat(find_templates_by_in_object(all_templates, item['_id']));
            });

            // если шаблон служит материалов для других шаблонов
            if(tmp_templates_to_calculate.length>0)
            {
                _.each(tmp_templates_to_calculate, function (template) {
                    calculate_template(all_templates, template, result_used_templates);
                });
                result = result_used_templates[template['_id']]['count'];
            }

            return result;
        }

        // надо получить сколько сейчас уже требуется данного шаблона для других шаблонов,
        // если вносимый объем больше, чем требуется то ничего страшного, если меньше то не вносить его
        // если требуемый объем больше чем тот, что вводим руками, то откатываем ручной объем к требуемому
        // дальше считать ничего не надо
        if(calculate_template_need_volume(all_templates, cur_temlate)>cur_temlate['count'])
        {
            throw new SyntaxError("Ошибка. Нельзя уменьшить объем данного шаблона. Данный шаблон используется в получении материала для других шаблонов. Проверьте данные и повторите попытку.");
            return;
        }

        // результирующих объект для хранения задействованных шаблонов
        var result_used_templates = {};
        // получение входящего объекта шаблона
        var in_object = cur_temlate['in_object'];
        // если исходный материал не покупно, то надо найти шаблон по которому он изготавливается
        // если шаблона нет, значит исходный материал изготавливается не по шаблону
        if(!('is_buy' in in_object) || !in_object['is_buy'])
        {
            // получем все шаблоны, которые могут изгтовить данный входящий объект
            // т.е имеют на выходе данный входящий объект
            var all_templates_who_can_make_in_object = find_templates_in_out_objects(all_templates, in_object);
            // из отобранных шаблонов собираем все выходящие объекты
            var all_out_objects_from_all_templates_who_can_make_in_object = templates_get_out_objects(all_templates_who_can_make_in_object);
            // находим все шаблоны, у которых на вход подается любое из найденных выходных изделий
            // т.е это те шаббоны, которые косвенно могут повлиять на шаблоны которые делают материал для текущих
            var tmp_templates_to_calculate = find_templates_by_in_objects(all_templates, all_out_objects_from_all_templates_who_can_make_in_object);
            _.each(tmp_templates_to_calculate, function (template) {
                calculate_template(all_templates, template, result_used_templates);
            });
        }
        return result_used_templates;
    }*/

});
