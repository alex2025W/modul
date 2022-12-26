<!--Шаблон отображения контейнера для формы настроек-->
<script id="PauseFormContainerTemplate" type="text/template">
  <div id = "pause-form-container">
    <div class="row">
      <div class="span12">
        <span class = "head">Приостановка планов.</span><br/>
        <span class = "lbl-info">Внимание, изменения затронут все отмеченные работы и наряды!</span>
      </div>
    </div>
    <div class="row">
      <div class="span12" id = "pause-form-box"></div>
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
<script id="PauseFormTemplate" type="text/template">
  <div class="row" style = "margin-top:10px;">
      <div class="span12">
        <label>Дата приостановки</label>
        <input  class="span2 datepicker1 date not-readonly" value="<%=date%>" type="text" readonly />
      </div>
    </div>
    <div class="row">
      <div class="span12" ">
        <label>Причина приостановки<br>
          <select name="pause_reason" id="pause-reason" style = "width:auto">
            <option value="0">--Выберите причину приостановки--</option>
            %for row in plans:
              <option value="{{str(row['_id'])}}">{{row['name']}}</option>
            %end
          </select>
        </label>
      </div>
    </div>
    <div class="row row-pause-reason-detail" style = "display:none;">
      <div class="span12">
        <label>Уточнение причины</label>
        <input
          id = 'pause-reason-detail'
          type = "text"
          style = "width:500px;"
          placeholder = "номер наряда/код работы, номер наряда/код работы"
          value = "<%=reason_nodes? reason_nodes.map(function(v){ return v.join('/')}).join(',') :''%>"
        />
      </div>
    </div>
    <div class="row">
      <div class="span12">
        <label>Комментарий<br>
          <textarea name="pause_comment" id="pause-comment" class="span12" value="<%=note%>"><%=note%></textarea>
        </label>
      </div>
    </div>
</script>

<!--Модальная форма настроек-->
<div class="static-box static-box-pause" style="display: none">
  <div
    id="pause-modal"
    class="modal hide mmodal"
    tabindex="-1"
    role="dialog"
    aria-hidden="false"
    data-backdrop="static">
  </div>
</div>
