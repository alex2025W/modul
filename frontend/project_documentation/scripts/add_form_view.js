var AddEditDlg = Backbone.View.extend({
  template:_.template($('#documentAddDlgTemplate').html()),
  pdf_files:[],
  source_files:[],
  initialize:function(){
    this.render();
  },
  events:{
    'click .close-btn':'onDlgClose',
    'click .save-btn':'onDlgSave'
  },
  render:function(){
    var self = this;
    // прослушка события закачки нового файла в документы догоыора
    Backbone.off("file_upload:complete");
    Backbone.on("file_upload:complete",this.new_google_file_upload_complete,this);
    var html = this.template();
    this.$el.html(html);

    // Заказы
    $(this.el).find('.orders-list').multiselect({
      buttonContainer: '<span class="dropdown dropdown-order-list" />',
      filterPlaceholder: 'Найти',
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 4,
      maxHeight: 400,
      onChange:function(element){
        self.checkGoogleFolder(element.val());
      }
    });
    $(this.el).find('.dropdown-order-list li.active').remove();

    // Участки
    $(this.el).find('.section-list').multiselect({
      buttonContainer: '<span class="dropdown dropdown-section-list" />',
      filterPlaceholder: 'Найти',
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 4,
      maxHeight: 400,
    });
    $(this.el).find('.dropdown-section-list li.active').remove();
  },
  show:function(){
    this.$el.modal("show");
  },
  onDlgClose:function(e){
    this.$el.modal('hide');
    this.$el.remove();
  },
  checkData:function(){
    if(!this.$('.orders-list').val()){
      $.jGrowl("Необходимо указать заказ", { 'themeState':'growl-error', 'sticky':true });
      return false;
    }
    if(!this.$('.section-list').val()){
      $.jGrowl("Необходимо указать раздел", { 'themeState':'growl-error', 'sticky':true });
      return false;
    }
    if(this.$('.stage-gr input:checked').length==0){
      $.jGrowl("Необходимо указать стадию", { 'themeState':'growl-error', 'sticky':true });
      return false;
    }
    if(this.pdf_files.length==0){
      $.jGrowl("Необходимо добавить файл проектной документации", { 'themeState':'growl-error', 'sticky':true });
      return false;
    }
    return true;
  },
  onDlgSave:function(e){
    if(!this.checkData())
      return;
    var data = {
      "order_number":this.$('.orders-list').val(),
      "section":{
        '_id': this.$('.section-list').val(),
        'name': this.$('.section-list option:selected').text()
      },
      "pdf_files":this.pdf_files,
      "source_files": this.source_files,
      "stage": this.$('.stage-gr input:checked').val(),
      "is_customer_agree": this.$('.is_customer_agree').is(":checked"),
      "description": this.$('.description').val(),
      "folder_id": this.folder_id
    };
    Routine.showLoader();
    var self = this;
    $.ajax({
      url: '/documentation/add_project_documentation',
      type: 'PUT',
      contentType: 'application/json',
      dataType: 'json',
      data:JSON.stringify(data),
      timeout: 35000,
      error: function (jqXHR, textStatus, errorThrown) {
        var msg = "Ошибка при получении данных.";
        $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':true });
        Routine.hideLoader();
      },
      success: function (result, textStatus, jqXHR) {
        Routine.hideLoader();
        if(result.status=='ok'){
          self.onDlgClose(e);
          App.filters.onFilter();
        }else{
          $.jGrowl(result.message, { 'themeState':'growl-error', 'sticky':true });
        }
      }
    });
  },

  checkGoogleFolder:function(order_number){
    Routine.showLoader();
    var self = this;
    self.clearUploaders();
    $.ajax({
      url: '/documentation/checkcontractfolder/'+order_number,
      type: 'GET',
      dataType: 'json',
      timeout: 35000,
      error: function (jqXHR, textStatus, errorThrown) {
        var msg = "Ошибка при получении данных.";
        $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':true });
        Routine.hideLoader();
      },
      success: function (result, textStatus, jqXHR) {
      //    console.log(JSON.stringify(result));
        Routine.hideLoader();
        if(result.status=='ok'){
          self.folder_id = result.folder_id;
          self.order_number = order_number;
          self.createUploaders();
        }else{
          $.jGrowl(result.message, { 'themeState':'growl-error', 'sticky':true });
        }
      }
    });
  },

  clearUploaders:function(){
    this.$(".empty-text").show();
    this.$(".upload-data-manager").hide();
    this.$('.new-files-pdf').html("");
    this.$('.source-files').html("");
    this.pdf_files = [];
    this.source_files = [];
  },

  createUploaders:function(){
    var self = this;
    this.$(".empty-text").hide();
    this.$(".upload-data-manager").show();
    this.filesPdfCtrl =  new Backbone.UploadManager({
          title: 'Файлы проектной документации (PDF):',
          //  uploadUrl: '/handlers/contracts/upload_document/'+self.order_number+'/pdf',
          acceptFileTypes: /(pdf)$/i,
          autoUpload: true,
          singleFileUploads: true,
          maxNumberOfFiles: 5,
          maxFileSize: 104857600,
          parentFolder: self.folder_id,
          documentType: 'file-pdf',
          make_files_list:true
      }).renderTo('.new-files-pdf');
    this.filesSourceCtrl = new Backbone.UploadManager({
          title: 'Исходники проектной документации:',
          //  uploadUrl: '/handlers/contracts/upload_document/'+self.order_number+'/pdf',
          acceptFileTypes: new RegExp(""),
          autoUpload: true,
          singleFileUploads: true,
          maxNumberOfFiles: 5,
          maxFileSize: 104857600,
          parentFolder: self.folder_id,
          make_files_list:true,
          documentType: 'source-files'
      }).renderTo('.source-files');
  },
  /**
     ** Обработка события завершения загрузки очередного файла-документа на гугл диск
    **/
  new_google_file_upload_complete: function(e)
  {
    var self = this;
    var uploaded_file_info = e[0];
    var google_file_info = e[1];

    // данные на сохранение
    var data_to_save = {
      //'document_type': uploaded_file_info.document_type,
      'size': uploaded_file_info.data.size,
      'name': uploaded_file_info.data.name,
      'google_file_id': google_file_info['id']
    };

    if(uploaded_file_info.document_type=='file-pdf')
      this.pdf_files.push(data_to_save);
    else
      this.source_files.push(data_to_save);
  }
});
