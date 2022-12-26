<html>
    <head>
        <style>
            .in-info {
              width: 100%;
              font-size: 12px;
              margin-bottom: 5px; }
              .in-info .inner-line {
                width: 100%;
                float: left;
                box-sizing: border-box;
                padding: 4px 0px;
                border-bottom: solid 1px #ccc;
                min-height: 39px; }
                .in-info .inner-line:last-child {
                  border-bottom: none; }
                .in-info .inner-line a {
                  margin-top: 6px; }
              .in-info td {
                padding: 4px;
                vertical-align: middle;
                box-sizing: border-box; }
              .in-info tbody td {
                border-bottom: dotted 1px #ccc; }
              .in-info thead {
                font-weight: bold; }
                .in-info thead td {
                  border-bottom: dotted 1px #ccc;
                  border-top: dotted 1px #ccc;
                  white-space: nowrap; }
              .in-info tfoot {
                font-weight: bold; }
                .in-info tfoot td {
                  border-bottom: dotted 1px #ccc;
                  white-space: nowrap; }
              .in-info tr.head {
                font-weight: bold; }
              .in-info tr:hover {
                background-color: whitesmoke; }
              .in-info tr.selected {
                background-color: #dbe1ec; }
                .lbl-header{
                    font-size: 18px;}
                .lbl{
                    font-size: 12px;}
        </style>
    </head>
    <body>
        %if len(main_positions)>0:
            <span class="lbl-header" style="font-size: 18px;">Основная продукция:</span>
            <table class="in-info" style="width: 100%;font-size: 12px;margin-bottom: 5px;">
                <thead style="font-weight: bold;">
                    <tr>
                        <td style="width: 10%;padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;border-top: dotted 1px #ccc;white-space: nowrap;">Заказ</td>
                        <td style="width: 30%;padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;border-top: dotted 1px #ccc;white-space: nowrap;">Название</td>
                        <td style="width: 30%;padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;border-top: dotted 1px #ccc;white-space: nowrap;">Назначение</td>
                        <td style="width: 10%;padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;border-top: dotted 1px #ccc;white-space: nowrap;">Тип</td>
                        <td style="width: 10%;padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;border-top: dotted 1px #ccc;white-space: nowrap;">Кол-во, ед.</td>
                        <td style="width: 10%;padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;border-top: dotted 1px #ccc;white-space: nowrap;">Площадь общая (кв.м)</td>
                    </tr>
                </thead>
                <tbody>
                %for row in main_positions:
                    <tr>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;">{{row['order_number']}}</td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;">{{row['name']}}</td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;">{{row['target']}}</td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;">{{row['type']}}</td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;">{{row['count']}}</td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;">{{row['square']}}</td>
                    </tr>
                %end
                </tbody>
                <tfoot style="font-weight: bold;">
                    <tr>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;white-space: nowrap;"></td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;white-space: nowrap;"></td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;white-space: nowrap;"></td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;white-space: nowrap;">Итого:</td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;white-space: nowrap;">{{main_summ_info['count']}}</td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;white-space: nowrap;">{{main_summ_info['square']}}</td>
                    </tr>
                </tfoot>
            </table>
            <br>
        %end
        %if len(dop_positions)>0:
            <span class="lbl-header" style="margin-top: 10px;font-size: 18px;">Доп. продукция:</span>
            <table class="in-info" style="width: 100%;font-size: 12px;margin-bottom: 5px;">
                <thead style="font-weight: bold;">
                    <tr>
                        <td style="width: 10%;padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;border-top: dotted 1px #ccc;white-space: nowrap;">Заказ</td>
                        <td style="width: 60%;padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;border-top: dotted 1px #ccc;white-space: nowrap;">Название</td>
                        <td style="width: 30%;padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;border-top: dotted 1px #ccc;white-space: nowrap;">Тип</td>
                    </tr>
                </thead>
                <tbody>
                %for row in dop_positions:
                    <tr>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;">{{row['order_number']}}</td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;">{{row['name']}}</td>
                        <td style="padding: 4px;vertical-align: middle;box-sizing: border-box;border-bottom: dotted 1px #ccc;">{{row['type']}}</td>
                    </tr>
                %end
                </tbody>
            </table>
            <br>
        %end
        <span class="lbl-header" style="font-size: 18px;">Группа: <a href="{{group['link']}}">{{group['name']}}</a></span>
        <br><br>
        <span class="lbl-header" style="font-size: 18px;">Участники:</span><br>
        %for row in members:
            <span class="lbl" style="font-size: 12px;">{{row['fio']}} ({{row['email']}})</span><br>
        %end
    </body>
</html>
