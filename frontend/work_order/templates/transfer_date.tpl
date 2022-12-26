<!--Шаблон отображения формы переноса сроков-->
<script id="TransferContainerTemplate" type="text/template">
  <!--Основная форма корректировок-->
  <div class="span12">
    <div class="tabbable">
      <ul class="nav nav-tabs">
        <li class="active"><a href="#tab-shift-dates" data-toggle="tab">Корректировка планов</a></li>
        <li><a href="#tab-stop-activity" data-toggle="tab">Простой</a></li>
      </ul>
      <div class="tab-content">
        <!--TAB SHIFT DATES-->
        <div class="tab-pane active" id="tab-shift-dates">
          <!--Форма детализации будущей корректировки-->
          <div class="confirm-transfer-box" style="display:none">
            <div class="row">
              <div class="span12">
                <strong>Подтверждение корректировки планов</strong>
              </div>
            </div>
            <div class="row" style = "margin-top:20px">
              <div class="span12">
                <span class = "font12 lbl-transfer-detail"></span>
              </div>
            </div>
            <div class="row">
              <div class="span12 text-right">
                <button class="btn cancel-data">Отмена</button>
                <button class="btn save-data btn-primary">Подтвердить</button>
              </div>
            </div>
          </div>
          <!--Форма управления корректировкой-->
          <div class="main-transfer-box">
            <div class="row">
              <div class="span12">
                <span>Внимание, изменения затронут все отмеченные работы!</span>
              </div>
            </div>
            <div class="row" style = "margin-top:10px;">
              <div class="span12">
                <label>Тип корректровки</label>
                <select name="transfer_type" id="transfer-type" style = "width:auto;">
                  <option value="">--Выберите тип корректировки--</option>
                  <option value="start">Перенос без изменения длительности</option>
                  <option value="both">Изменение длительности</option>
                </select>
              </div>
            </div>
            <!--Основной блок с данными-->
            <div class="row main-data-controls" style="display: none; margin-left:0px;">
              <div class="row row-type-comment-start" style = "display:none;">
                <div class="span12">
                  <label style = "color: #999" class = "font12">Укажите новую начальную дату для выбранной группы работ. Дата определяется по дате начала самой ранней работы в группе. Все остальные работы в группе будут перемещены пропорционально, относительно новой начальной даты.</label>
                </div>
              </div>
              <table class="in-info" style = "width:500px; margin:20px 0px">
                <thead>
                  <tr>
                    <td></td>
                    <td style = "width:160px;">Дата начала:</td>
                    <td style = "width:160px;">Дата окончания:</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>Наши планы:</b></td>
                    <td><input  class="span2 datepicker1 datestart not-readonly" value="" type="text" readonly /></td>
                    <td><input  class="span2 datepicker2 datefinish not-readonly" value="" type="text" readonly /></td>
                  </tr>
                  <tr>
                    <td><b>Планы по договору:</b></td>
                    <td><input  class="span2 contract_plan_datepicker1 contract_plan_datestart not-readonly" value="" type="text" readonly /></td>
                    <td><input  class="span2 contract_plan_datepicker2 contract_plan_datefinish not-readonly" value="" type="text" readonly /></td>
                  </tr>
                </tbody>
              </table>
              <div class="row">
                <div class="span12" ">
                  <label>Причина переноса<br>
                  <select name="transfer_reason" id="transfer-reason" style = "width:auto">
                    <option value="0">--Выберите причину переноса--</option>
                    %for row in plans:
                    <option value="{{str(row['_id'])}}">{{row['name']}}</option>
                    %end
                  </select>
                  </label>
                </div>
              </div>
              <div class="row row-transfer-reason-detail" style = "display:none;">
                <div class="span12">
                  <label>Уточнение причины</label>
                  <input id = 'transfer-reason-detail' type = "text" style="width:500px;" placeholder="номер наряда/код работы, номер наряда/код работы"></input>
                </div>
              </div>
              <div class="row">
                <div class="span12">
                  <label>Комментарий<br>
                  <textarea name="transfer_comment" id="transfer-comment" class="span12"></textarea>
                  </label>
                </div>
              </div>
              <div class="row">
                <div class="span12 text-right">
                  <button class="btn close-dialog">Отмена</button>
                  <button class="btn transfer-data btn-primary">Просмотр</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!--TAB STOP ACTIVITY-->
        <div class="tab-pane" id="tab-stop-activity">
          <div class="row">
            <div class="span12">
              <span>Внимание, изменения затронут все отмеченные работы!</span>
            </div>
          </div>
          <div class="row" style = "margin-top:10px;">
            <div class="span12">
              <label>Дата простоя</label><br/>
              <input  class="span2 datepicker1 date not-readonly" value="" type="text" readonly />
            </div>
          </div>
          <div class="row">
            <div class="span12" ">
              <label>Причина простоя<br>
                <select name="transfer_reason" id="transfer-reason" style = "width:auto">
                  <option value="0">--Выберите причину простоя--</option>
                  %for row in plans:
                  <option value="{{str(row['_id'])}}">{{row['name']}}</option>
                  %end
                </select>
              </label>
            </div>
          </div>
          <div class="row row-transfer-reason-detail" style = "display:none;">
            <div class="span12">
              <label>Уточнение причины</label>
              <input id = 'transfer-reason-detail' type = "text" style="width:500px;" placeholder="номер наряда/код работы, номер наряда/код работы"></input>
            </div>
          </div>
          <div class="row">
            <div class="span12">
              <label>Комментарий<br>
              <textarea name="transfer_comment" id="transfer-comment" class="span12"></textarea>
              </label>
            </div>
          </div>
          <div class="row">
            <div class="span12 text-right">
              <button class="btn close-dialog">Отмена</button>
              <button class="btn save-data btn-primary">Сохранить</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</script>
