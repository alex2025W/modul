/**
 * Контрол наблюдения за мультипользовательским режимом доступа на страницу
 */
var MultiPageAccessApp = {
  Models: {},
  Views: {},
  controls_to_disable: [], // список идентификаторов кнопок, которые необходимо блокировать
  item_view: null, // представление объекта который необходимо блокировать

  start: function(container, info, controls_to_disable) {
    this.controls_to_disable = controls_to_disable;
    // отрисовка представления объекта
    this.item_view = new MultiPageAccessApp.Views.ItemView({
      el: $(container),
      model: new MultiPageAccessApp.Models.ItemModel(info)
    });
  },

  stop: function() {
    this.item_view.onFinish();
  },
  get_users: function() {
    return this.item_view.get_users();
  }
};

MultiPageAccessApp.Models.ItemModel = Backbone.Model.extend({
  defaults: {
    key: "",
    users: [],
    current_user: {}
  },
  initialize: function() {},
  idAttribute: "_id"
});

MultiPageAccessApp.Views.ItemView = Backbone.View.extend({
  mode: "on", //off
  status_timer: null,
  templates: {
    main: _.template($("#MultiPageAccessTemplate").html())
  },

  initialize: function() {
    this.onStart();
  },

  render: function() {
    var anotherUsers = [];
    for (var i in this.model.get("users"))
      if (
        this.model.get("users")[i]["email"] !=
        this.model.get("current_user")["email"]
      )
        anotherUsers.push(this.model.get("users")[i]);
    if (anotherUsers.length > 0) {
      this.$el.html(this.templates.main(this.model.toJSON()));
      this.disableExternalControls(true);
    }
  },

  /**
   * Получить список текущих пользователей
   */
  get_users: function() {
    var result = [];
    for (var i in this.model.get("users"))
      if (
        this.model.get("users")[i]["email"] !=
        this.model.get("current_user")["email"]
      )
        result.push(this.model.get("users")[i]);
    return result;
  },

  /**
   * Очистка таймера проверки статуса
   */
  clear_status_timer: function() {
    if (this.status_timer) clearTimeout(this.status_timer);
    this.status_timer = null;
  },

  /**
   *  Активация/деактивация внешних элементов управления
   *  зависящих от монопольного режима
   */
  disableExternalControls: function(val) {
    Backbone.trigger("global_multi_page_access_mode:disable_controls", [
      self,
      val
    ]);
  },

  /**
   * Принудительное завершение сеанса
   */
  onFinish: function() {
    this.clear_status_timer();
    this.disableExternalControls(true);
    this.mode = "off";
    this.$el.empty();
  },

  /**
   * Старт отслеживания информации
   */
  onStart: function() {
    this.render();
    this.clear_status_timer();
    Backbone.trigger("global_multi_page_access_mode:update_all_data", [this]);
    this.mode = "on";
    this.checkStatus();
  },

  /**
   * Проверка статуса многовользовательского режима
   */
  checkStatus: function() {
    var self = this;
    if (this.mode === "off") return;
    self.status_timer = setTimeout(function() {
      $.ajax({
        type: "POST",
        url: "/handlers/service/get_multi_page_access_users",
        data: JSON.stringify({ page_key: self.model.get("key") }),
        timeout: 5000,
        contentType: "application/json",
        dataType: "json",
        async: true
      })
        .done(function(result) {
          if (result["status"] == "error") {
            self.clear_status_timer();
            self.checkStatus();
          } else {
            self.model = new MultiPageAccessApp.Models.ItemModel(result.data);
            self.render();
            self.clear_status_timer();
            self.checkStatus();
          }
        })
        .error(function() {
          self.clear_status_timer();
          self.checkStatus();
        });
    }, 5000);
  }
});
