///
/// Модель элемента
///
App.Models.ItemModel = Backbone.Model.extend({
    defaults: {
        datalink:null,
        parent_id: null,
        routine: 0,
        alias:"",
        note: '',
        open_value: false,
        status:'',
        is_system:false,                        // системный
        is_objective_system: false,  // косвенно системный
        is_buy: false,                              // признак покупного
        is_complect: false,                   // признак комплекта
        is_otbor: false,                   // признак отбора
        is_separate: false,                   // разделительная операция
        is_inherit: false,                         // наследуемый объект
        is_input: false,                           // объект является входом в какой то группе объектов(исп. в шаблонах)
        is_optional: false,                    // признак опционального свойства
        is_techno: false,                       // признак технологического свойства
        number:''                                     // артикул
    },
    initialize: function() {
        this.on('change:name', this.changeName, this);
        this.on('change:number', this.changeName, this);
        this.on('change:is_buy', this.changeBuy, this);
        this.on('change:is_system', this.changeSystem, this);
        this.on('change:is_objective_system', this.changeObjectiveSystem, this);
    },
     idAttribute: "_id",
    //url: '/handlers/esud/',
    url:function(){
        return "/handlers/esud/element"+(this.get("_id")?("/"+this.get("_id")):"");
    },

    /**
    * Событие на смену поля name в модели
    **/
    changeName: function(){
        // вызов события обновления информации об объекте в информационной панеле
        Backbone.trigger('control:refreshPanelItemInfo',[this]);
    },
    /**
    * Событие на смену поля is_buy в моделе
    **/
    changeBuy: function(){
        // если свойство покупное сбрасывается, необходимо проверить причину
        // и восстановить при необходимости
        if(!this.get('is_buy'))
            App.CheckOnBuy(this.get('_id'));
        Backbone.trigger('control:refreshPanelItemInfo',[this]);
    },

    /**
    * Событие на смену поля is_system в моделе
    **/
    changeSystem: function(){
        // если сволйство системности сбрасывается, необходимо проверить причину
        // и восстановить при необходимости
        if(!this.get('is_system'))
            App.CheckOnSystem(this.get('_id'));
    },

    /**
    * Событие на смену поля is_objective_system в моделе
    **/
    changeObjectiveSystem: function(){
        // если сволйство системности сбрасывается, необходимо проверить причину
        // и восстановить при необходимости
        if(!this.get('is_objective_system'))
            App.CheckOnSystem(this.get('_id'));
    }
});

///
/// Модель элемента поиска
///
App.Models.searchItemModel = Backbone.Model.extend({
    defaults: {
        datalink:null,
        parent_id: null,
        routine: 0,
        note: '',
        path: '',
        dacoded_path: '',
        status:'',
        is_system:false,                        // системный
        is_objective_system: false,  // косвенно системный
        is_buy: false,                              // признак покупного
        is_complect: false,                   // признак комплекта
        is_otbor: false,                   // признак отбора
        parent_object: null,                   // информация о родительском объекте
        is_separate: false,                   // разделительная операция
        is_inherit: false,                         // наследуемый объект
        is_input: false,                           // объект является входом в какой то группе объектов(исп. в шаблонах)
        is_optional: false,                    // признак опционального свойства
        is_techno: false,                       // признак технологического свойства
        number:''                                     // артикул
    },
     idAttribute: "_id",
    url: '/handlers/esud/'
});
