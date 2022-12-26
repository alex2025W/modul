var DocumentsList = Backbone.View.extend({
  el:$("#documentation-list"),
  template:_.template($('#documentListTemplate').html()),
  filters:{},
  page_count:1,
  cur_page:1,
  initialize:function(){

  },
  events:{
    'click .document-list-pager a':'onPageClick'
  },
  render:function(){
    var self = this;
    var pagers = {
      'cur_page':this.filters.page || 1,
      'count': this.page_count || 1,
      'elements':this.collection.length
    };
    // отрисовка теймплеййта
    this.$el.html(this.template(pagers));
    // сброс события окончания загрузки файла
    Backbone.off("file_upload:complete");
    // отрисовка всей коллекции
    this.collection.each(function(item){
      var d = new DocumentElem({model:item});
      self.$('.documents').append(d.$el);
      //-------------------------------------------------------
      // инициализаци аплоадера
      if(item.get('folder_id'))
      {
        d.$el.find(".upload-data-manager").show();
        this.filesPdfCtrl =  new Backbone.UploadManager({
          title: 'Добавить дополнительные файлы:',
          acceptFileTypes: new RegExp(""),
          autoUpload: true,
          singleFileUploads: true,
          maxNumberOfFiles: 5,
          maxFileSize: 104857600,
          parentFolder: item.get('folder_id'),
          documentType: 'dop-files',
          make_files_list:true,
          control_id: item.get('_id')
        }).renderTo('.dop-files-'+item.get('_id'));
      }
      //--------------------------------------------------------
    });
  },
  Fill:function(filters){
    var self = this;
    this.filters = filters;
    Routine.showLoader();

    $.ajax({
      url: '/documentation/get_project_documentation_list',
      type: 'POST',
      data: JSON.stringify(filters),
      contentType: 'application/json',
      dataType: 'json',
      timeout: 35000,
    }).done(function(result) {
        if(result.status=='ok'){
          self.page_count = Math.ceil(result.count/50);
          self.cur_page = filters.page || 1;
          self.collection = new DocumentCollection(result.docs || []);
          self.render();
        }
        else
          $.jGrowl(result.message, { 'themeState':'growl-error', 'sticky':true });
    }).always(function(){Routine.hideLoader();
    }).error(function(e){
      $.jGrowl('Ошибка сервера, попробуйте повторить попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    });
  },
  onPageClick:function(e){
    var pg = $(e.currentTarget).data("page");
    Backbone.trigger('global:on_url_params_change',[self, 'page', pg]);
    this.filters.page = pg;
    this.Fill(this.filters);
  }
});


var DocumentElem = Backbone.View.extend({
  template:_.template($('#documentElementTemplate').html()),
  initialize:function(){
    this.render();
  },
  render:function(){
    // отрисовка темплейта
    this.$el.html(this.template(this.model.toJSON()));

    // прослушка события закачки нового файла в документы догоыора
    Backbone.on("file_upload:complete",this.new_google_file_upload_complete,this);

    /*// инициализаци аплоадера
    this.$(".upload-data-manager").show();
    this.filesPdfCtrl =  new Backbone.UploadManager({
      title: 'Добавить файлы:',
      acceptFileTypes: new RegExp(""),
      autoUpload: true,
      singleFileUploads: true,
      maxNumberOfFiles: 5,
      maxFileSize: 104857600,
      parentFolder: this.model.get('folder_id'),
      documentType: 'dop-files',
      make_files_list:true
    }).renderTo('.dop-files-'+this.model.get('_id'));*/
  },

  /**
   * Обработка события завершения загрузки очередного файла-документа на гугл диск
   */
  new_google_file_upload_complete: function(e)
  {
    var self = this;
    var uploaded_file_info = e[0];
    var google_file_info = e[1];
    if(uploaded_file_info.control_id == this.model.get('_id'))
    {
      // данные на сохранение
      var data = {
        '_id': this.model.get('_id'),
        'size': uploaded_file_info.data.size,
        'name': uploaded_file_info.data.name,
        'google_file_id': google_file_info['id'],
        'folder_id': this.model.get('folder_id')
      };
      Routine.showLoader();
      var self = this;
      $.ajax({
        url: '/documentation/add_additional_documentation',
        type: 'PUT',
        contentType: 'application/json',
        dataType: 'json',
        data:JSON.stringify(data),
        timeout: 35000,
      }).done(function(result) {
        if(result.status=='ok'){
          // добавить в модель новые данные по документам
          // перерисовать представление
        }
        else
          $.jGrowl(result.message, { 'themeState': 'growl-error', 'sticky': true });
      }).always(function(){Routine.hideLoader();
      }).error(function(e){
        $.jGrowl('Ошибка сервера, попробуйте повторить попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      });
    }
  }
});
