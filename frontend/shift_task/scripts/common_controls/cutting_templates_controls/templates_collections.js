///
/// Коллекция шаблонов примененных в калькуляции
///
App.Collections.TemplatesCollection = MultiSortCollection.extend({
    model: App.Models.TemplateModel,
    specifications_collection: null,
    templatesCalculator: null, // объект для выполнения расчетов по шаблонам

    /**
    ** Инициализация
    **/
    initialize: function(models, options) {
        // если заданы расширенные параметры
        if(options)
        {
            // создаем коллекцию спецификаций, задействованные в расчетах
            this.specifications_collection = options.specifications_collection;
        }
        // создаем объект-калькулятор шаблонов
        this.tremplatesCalculator = new TemplatesCalculator(
            models.map(function(item){return item.toJSON()}),
            this.specifications_collection?this.specifications_collection.models:null
        );
        //--EVENTS BY TRIGGER----------------------------------------
        Backbone.on("templates:calculate_facts_by_specifications",this.calculateFactsDataBySpecifications, this);
        //Backbone.on("templates:calculate_plans_by_specifications",this.calculatePlansDataBySpecifications, this);
    },

    /**
     ** Функция пересчета фактов по шаблонам по спецификациям
     ** в пересчете учитываются только спецификации с ненулевыми фактическими объемами
    **/
    calculateFactsDataBySpecifications: function(){
        // get all specifications with not empty volumes
        let specifications_to_calculate = [];
        _.each(this.specifications_collection.models, function (item) {
          let prefact_val = 0
          let fact_val = 0
          if(item.get('pre_fact') && item.get('pre_fact')['value'])
              prefact_val = Routine.strToFloat(item.get('pre_fact')['value'])
          if(item.get('fact') && item.get('fact')['value'])
              fact_val = Routine.strToFloat(item.get('fact')['value'])
          if(prefact_val + fact_val>0)
                specifications_to_calculate.push({
                  _id:item.get('_id'),
                  key: item.get('number'),
                  count:prefact_val + fact_val
                })
        });
        // выполнение рассчетов по шаблонам
        var calculated_templates =  this.tremplatesCalculator.calculate_facts_by_specifications(specifications_to_calculate);
        // проходим по всем моделям и выставляем фактические объемы
        _.each(this.models, function (item) {
            if(calculated_templates &&  item.get('_id') in calculated_templates)
                item.set('fact_count', calculated_templates[item.get('_id')]);
            else
                item.set('fact_count', 0);
        });
    },

    /**
     * Функция пересчета планов  по шаблонам по спецификациям
     * в пересчете учитываются только спецификации с ненулевыми фактическими объемами
     * и только те для которых требуется раскрой
     *  specifictions - список моделей спецификаций, по которым необходим рассчет
     */
    calculatePlansDataBySpecifications: function(specifictions){
        // очистка плановых объемов перед очередным вычислением
        this.clearCounts(true);
        let result = []
        // get all specifications with not empty volumes and with flags:  use_templates + need_templates
        let specifications_to_calculate = [];
        _.each(specifictions, function (item) {
          if(item.get('need_templates') && item.get('use_templates'))
          {
                specifications_to_calculate.push({
                  _id:item.get('_id'),
                  key: item.get('number'),
                  count:Routine.strToFloat(item.get('volume'))
                })
            }
        });

        if(specifications_to_calculate.length>0)
        {
            // выполнение рассчетов по шаблонам
            var calculated_templates =  this.tremplatesCalculator.calculate_plans_by_specifications(specifications_to_calculate);
            // проходим по всем моделям и выставляем рассчитанные объемы
            _.each(this.models, function (item) {
                if(calculated_templates &&  item.get('_id') in calculated_templates)
                    item.set('count', calculated_templates[item.get('_id')]);
                //else
                //    item.set('count', 0);
            });
        }
        // собираем все выходящие от шаблонов спецификации и возвращаем в качестве результата
        return this.getAllPlansOutItems();
    },

    /**
    ** Получение фактических объемов из выпускаемых шаблонами спецификаций
    ** В результате объемы повторяющихся спецификаций суммируются
    **/
    getAllFactsOutItems: function () {
        var self = this;
        var result = {};
        _.each(this.models, function (item) {
            for(var i in item.get('out_objects'))
            {
                if(!(item.get('out_objects')[i]['_id'] in result))
                    result[item.get('out_objects')[i]['_id']] = 0;
                result[item.get('out_objects')[i]['_id']]+= item.get('out_objects')[i]['count'] * item.get('fact_count');
            }
        });
        return result;
    },

    /**
    ** Получение плановых  объемов из выпускаемых шаблонами спецификаций
    ** В результате объемы повторяющихся спецификаций суммируются
    **/
    getAllPlansOutItems: function () {
        var self = this;
        var result = {};
        _.each(this.models, function (item) {
            for(var i in item.get('out_objects'))
            {
                if(!(item.get('out_objects')[i]['_id'] in result))
                    result[item.get('out_objects')[i]['_id']] = 0;
                result[item.get('out_objects')[i]['_id']]+= item.get('out_objects')[i]['count'] * item.get('count');
            }
        });
        return result;
    },

    /**
     * Получить список шаблонов с непустыми плановыми объемами
     * Те у кого count > 0
     */
     getNotEmptyTemplates: function()
     {
        return this.models.filter(function(item){return item.get('count') && Routine.strToFloat(item.get('count'))>0 });
     },

     /**
     * Очистить плановые объемы у шаблонов
     * val - silent [true/false]
     */
     clearCounts: function(val)
     {
        var val = val || false;
        _.each(this.models, function (item) {item.set('count',0, {silent: val})});
        this.trigger('render', this);
     },

     /**
     * Очистить фактовые объемы у шаблонов
     */
     clearFacts: function()
     {
        _.each(this.models, function (item) {item.set('fact_count',0, {silent: true})});
        this.trigger('render', this);
     },

    /**
     * фильтрация данных по сектору
     */
    bySector: function (id) {
        var filtered_templates = this.filter(function (item) { return item.get("sector_id") === id});
        var filtered_specifications = this.specifications_collection?this.specifications_collection.filter(function (item) { return item.get("sector")['origin_id'] === id}):null
        return new App.Collections.TemplatesCollection(filtered_templates, {specifications_collection: new App.Collections.ItemsCollection( filtered_specifications)});
    },

    /**
     * очиска данных по сектору
     */
    clearBySector: function (id) {
        var filtered = this.filter(function (item) { return item.get("sector_id") === id});
        for(var i in filtered)
            this.remove(filtered[i]);
    }
});
