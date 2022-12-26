<!--Шаблон отображения контейнера для формы настроек-->
<script id="SettingsFormContainerTemplate" type="text/template">
  <div id = "settings-form-container">
    <div class="row">
      <div class="span12">
        <span class = "head">Настройки работ по календарю.</span><br/>
        <span class = "lbl-info">Внимание, изменения затронут все отмеченные работы и наряды!</span>
      </div>
    </div>
    <div class="row">
      <div class="span12" id = "settings-form-box"></div>
      <div class="span12 pnl-workers-container" id = "workers-form-box"></div>
    </div>
    <div class="row">
      <div class="span12 text-right">
        <button class="btn close-dialog">Отмена</button>
        <button class="btn save-data btn-primary">Сохранить</button>
        <button class="btn remove-data btn-danger">Удалить</button>
      </div>
    </div>
  </div>
</script>

<!--Шаблон отображения  формы настроек-->
<script id="SettingsFormTemplate" type="text/template">
  <form class="form-horizontal mainForm">
    <fieldset><legend>Календарь</legend>
      <div class="form-group">
        <label class="control-label col-sm-2" for="input">Рабочий день, часов:</label>
        <div class="col-sm-6">
          <input type="text" class="form-control tb tb-work-day" value="<%=workday%>" style="width:30px;">
        </div>
      </div>
      <div class="form-group">
        <label class="control-label col-sm-2" for="input">Рабочая неделя:</label>
        <div class="col-sm-6">
            <div class="checkbox">
              <select class="ddl-work-week" style = "width:55px;">
                <option <%=workweek=='5'?'selected':''%> value="5">5</option>
                <option <%=workweek=='6'?'selected':''%> value="6">6</option>
                <option <%=workweek=='7'?'selected':''%> value="7">7</option>
              </select>
            </div>
        </div>
      </div>
      <div class="form-group">
        <label class="control-label col-sm-2" for="input">Учитывать праздники:</label>
        <div class="col-sm-6">
          <input type="checkbox" class="form-control cb-use-weekend" <%=use_weekends=='yes'?'checked':''%> style = "margin-top:6px;">
        </div>
      </div>
    </fieldset>
  </form>
</script>

<!--ШАБЛОН КОНТЕЙНЕРА РАБОТНИКОВ-->
<script id = "PnlWorkersContainerTemplate" type="text/template">
  <form class="form-horizontal mainForm">
    <fieldset><legend>Ресурсы</legend>
      <div class="pnl-workers-container" style="width: 600px;">
        <div class="line data-container data-workers-container" ></div>
        <div class="line" style="margin:10px 0px 10px 0px">
          <button
            type="button"
            id="btnAddWorker"
            class="btn btn-add-worker"
            style="float:left; margin-right:10px;">
            <i class="fa fa fa-user-plus"></i>&nbsp;Добавить работника
          </button>
        </div>
      </div>
    </fieldset>
  </form>
</script>
<!--ШАБЛОН ЭЛЕМЕНТА РАБОТНИКА-->
<script id="WorkerItemTemplate" type="text/template">
  <div class = "item" style = "width:90%">
    <input type = "text" class = "tb fio" value = "<%=user_fio%>" placeholder="неопределенный работник" />
  </div>
  <div class = "item" style = "width:10%;">
    <button
      type = "button"
      class = "btn lnk-remove-item"
      style = "float:right;"
      title="удалить работника"><i class="fa fa-remove"></i>
    </button>
  </div>
</script>

<!--Модальная форма настроек-->
<div class="static-box static-box-settings" style="display: none">
  <div
    id="settings-modal"
    class="modal hide mmodal"
    tabindex="-1"
    role="dialog"
    aria-hidden="false"
    data-backdrop="static">
  </div>
</div>
