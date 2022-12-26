%def scripts():
<script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
<script src="/static/scripts/libs/bootstrap-datepicker.min-1.4.0.js?v={{version}}"></script>
<script src="/static/scripts/libs/bootstrap-datepicker.ru.min.js?v={{version}}"></script>
<script src="/static/scripts/libs/bootstrap-inputmask.min.js?v={{version}}"></script>
<script src="/static/scripts/chart.js?v={{version}}"></script>
<script src="/static/scripts/money/app.js?v={{version}}"></script>
%end

%rebase master_page/base page_title='Прогноз движения денежных средств', current_user=current_user, version=version, scripts=scripts, menu=menu
<style>
    h3 {
        font-size: 16px;
    }

    .italic {
        font-style: italic;
    }

    input[name=order-ids] {
      width: 100%;
    }

    .input-container {
      margin: .5em 0;
    }
    .container1 .wr1{
      float: none;
    }
    .finder-loader {
        background: url(/static/img/spinner.gif) 50% 50% no-repeat #fff;
        width: 100%;
        height: 100%;
        display: block;
        position: absolute;
        top: 0;
        right: 0;
    }
    @media all and (max-width: 1200px) {
      .row{
        margin-left: 0;
      }
    }
</style>

<div id="date-calculators">
  <div class="italic"></div>
  <article>
        <div style="margin-top:20px; margin-bottom: 20px;">
          <div class="tabs">
            <div class="tabs__menu">
              <div class="tabs__tab active" data-target="chart-canvas-container">Графики</div>
              <div class="tabs__tab" data-target="chart-table">Таблицы</div>
            </div>
            <div id="chart-canvas-container" class="tab__content active" style="margin-top:20px; position: relative;">
                <div class="finder-loader" style="display: block;"></div>
                <canvas id="planned-data-chart" width="400" height="300"></canvas>
            </div>
            <div id="chart-table" class="tab__content" style="position: relative;">
            <div class="finder-loader" style="display: block;"></div>
              <table id="planned-data-table" class="table table-striped">
                <thead>
                  <td>Дата</td>
                  <td>Приход</td>
                  <td>Расход</td>
                  <td>Баланс</td>
                </thead>
                <tbody>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div>
          <div id="controlPanel" class="navbar-inner" style="padding-top:10px; width: calc(100% - 56px);">
            <div class="line">
              <div class="input-prepend input-append full-view simple-view" style="white-space: normal">
                <span style="white-space: nowrap">
                  <span class="add-on"><b class="icon-calendar"></b>Дата от:</span>
                  <input type="text" placeholder="дд.мм.гггг" name="date-from" class="input-small date-type" style="width:100px; border-radius:4px 0 0 4px" />
                  <span class="add-on"><b class="icon-th"></b></span>
                </span>
                <span style="white-space: nowrap">
                  <span class="add-on">до:</span>
                  <input type="text" placeholder="дд.мм.гггг" name="date-to" class="input-small date-type" style="width:100px; border-radius:4px 0 0 4px">
                  <span class="add-on" style="margin-right: 10px;"><b class="icon-th"></b></span>
                </span>
                <input type="button" name="send" class="btn btn-primary btn-filter" value="Показать">
              </div>
            </div>
            <div class="line" style="margin-bottom: 10px;">
              <span>Дата последнего обновления: <span id="lastupdate"></span></span>
            </div>
          </div>
        </div>
    </article>
</div>
