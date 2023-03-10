%def scripts():
  <link href="/static/css/user.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/esudspecification_calculation.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/treeview.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/font-awesome.min.css?v={{version}}" rel="stylesheet">
  <script src="/static/scripts/esudspecification_calculation/app.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification_calculation/model_item.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification_calculation/view_productinfo.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification_calculation/view_controlpanel.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification_calculation/view_data.js?v={{version}}"></script>
  <!-- specification filter-->
  <script src="/static/scripts/esudspecification_calculation/model_specification_filter.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification_calculation/collection_specification_filter.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification_calculation/view_specification_filter.js?v={{version}}"></script>
  <!-- complect filter-->
  <script src="/static/scripts/esudspecification_calculation/model_complect_filter.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification_calculation/collection_complect_filter.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification_calculation/view_complect_filter.js?v={{version}}"></script>
  <!---->
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/user_controls/single_mode.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/rawdeflate.js?v={{version}}"></script>
  <script src="/static/scripts/libs/base64.js?v={{version}}"></script>
  <script src="/static/scripts/libs/b64.js?v={{version}}"></script>
  <script src="/static/scripts/user_controls/queue.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.collapsibleFieldset.js?v={{version}}"></script>

  <script>$(function() {
      $.ajaxSetup({timeout:50000});
      bootbox.setDefaults({locale: "ru",});
      $("#esud_calculation").show();
       // ?????????????????????????? ???????????????????? ???????????????? ????????????
       App.initialize({{! system_objects }});
       // ?????????????????????????? ???????????????????????? ???????????? ???????????? ?? ????????????
       SingleModeApp.initialize({{! single_mode_time}}, {{! page_single_mode_info }},'esud_specification_calculation', ['#btn_to_develop'], {'fio': "{{! current_user['fio']}}", 'email':"{{! current_user['email']}}" } );
    });
  </script>
%end
%rebase master_page/base_lastic page_title='????????????????????????. ??????????????', current_user=current_user, version=version, scripts=scripts,menu=menu, data=data

%include esud/specification_calculation/buy_items_template
%include esud/specification_calculation/own_items_template
%include esud/specification_calculation/plan_norms_template
%include esud/specification_calculation/side_object_template

<!--SPECIFICATION INFORMATION TEMPLATE-->
<script id="productItemInfoTemplate" type="text/template">
  <% if(obj){
      var p1 = "";
      var p2="";
      var unique_props_str = "";
      for(var i in obj.properties) {
      if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR1_PROP'] && obj.properties[i].configuration_path=="") {
          p1 = obj.properties[i].value.value
      }
      if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR2_PROP'] && obj.properties[i].configuration_path=="") {
        p2 = obj.properties[i].value.value
      }
      if(obj.properties[i]['is_optional'] && !obj.properties[i]['is_techno'])
            unique_props_str += obj.properties[i]['name'] + ": " + obj.properties[i]['value'] +  ((obj.properties[i]['unit'] && obj.properties[i]['unit']!='?')?' ' +obj.properties[i]['unit']:'') + '; ';
   }} %>
  <a href="/esud/specification#<%=number%>" title = "?????????????? ?? ??????????????????"><%=(obj && 'number' in obj && number)?number+'&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=name%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></a>
</script>
<!-- ?????????????? ???????????????????????? ???????????? ???????????? ?? ???????????? -->
<!--?????????????????????? ??????????-->
<script id="templateOwnMode" type="text/template">
  <div class="input-prepend input-append">
      <span class="add-on"><b class="fa fa-clock-o"></b>
        <span class = 'lbl' style = "margin-left:10px;">
        <% var time_remain = SingleModeApp.single_mode_time-Math.ceil(moment(Routine.convertToUTC(new Date()) ).diff(status_date,'minute'));
          if(time_remain<0)
          time_remain = 0%>
          ???? ???????????????????? ???????????? ???????????? ?? ???????????? ????????????????: <%=time_remain%> ??????.
        </span>
      </span>
      <!--<button class="btn btn-finish">?????????????????? ??????????</button>-->
  </div>
</script>
<!-- ?????????? ????????????????????????-->
<script id="templateGuestMode" type="text/template">
  <div class="input-prepend input-append" >
      <span class="add-on" style="height: initial">
        <!--<b class="fa fa-clock-o"></b>-->
        <span class = 'lbl' style = "margin-left:10px;font-size: 11px">?????????? ???????????? ??????????????????????????: <%=user_name + " (" + user_email + ")" %>. ???????????? ?? ???????????? ?????????? ?????????????????? ?? ???????????? ?? ???????????????????????? ????????????????????.</span><br/>
      </span>
      <button class="btn btn-get-access" >???????????????? ????????????</button>
  </div>
</script>
<!-- ?????????? ????????????????-->
<script id="templateFreeMode" type="text/template">
  <div class="input-prepend input-append">
      <span class="add-on"><b class="fa fa-clock-o"></b>
        <span class = 'lbl' style = "margin-left:10px; font-size: 11px">?????????? ???????????????? ?? ???????????? ?????????????????? ????????????????????.</span>
      </span>
      <button class="btn btn-start">???????????????? ????????????</button>
  </div>
</script>
<!--?????????????? ???????????????????? ???? ????????????????????????-->
<!--<script id="filterItemTemplateSpecificationPlus" type="text/template">
  <span class="add-on lbl-specification-info" style = "<%=((label)?'':'display:none')%>"><%=label%></span>
  <span class="add-on" title = "???????????????? ???????????????????????? ?? ??????????????"><b class="fa fa-file-text-o"></b></span>
  <input type="text" class="tb-specification-number"  placeholder="?????????????? ????????????????????????" value = "<%=number%>" style = "width:170px;" title = "?????????????? ????????????????????????" />
  <input type="text" class="tb-specification-volume"  placeholder="????????????????????" value = "<%=count%>" style = "width:100px;" title = "?????????????????? ????????????????????" />
  <button style = "display:none" class = "btn btn-action btn-add" title = "???????????????? ?????? ????????????????????????" ><i class="fa fa-plus-circle"></i></button>
</script>-->
<script id="filterItemTemplateSpecificationMinus" type="text/template">
  <td>
    <input type="text" class="tb-specification-number"  placeholder="" value = "<%=number%>" style = "width:100px;" title = "?????????????? ????????????????????????" />
  </td>
  <td>
    <input type="text" class="tb-specification-volume"  placeholder="????????????????????" value = "<%=count%>" style = "width:50px;" title = "?????????????????? ????????????????????" />
  </td>
  <td><%=name%></td>
  <td><%=tech_props %></td>
  <td><%=unique_props %></td>
  <td><%=Routine.rNToBr(note) %></td>
  <td><%=date_add%></td>
  <td><%=user_add%></td>
  <td><button class = "btn btn-action btn-remove" title = "?????????????? ???????????????????????? ???? ????????????" ><i class="fa fa-minus-circle"></i></button></td>
</script>

<!--?????????????? ???????????????????? ???? ??????????????????-->
<!--<script id="filterItemTemplateComplectPlus" type="text/template">
  <span class="add-on lbl-complect-info" style = "<%=((label)?'':'display:none')%>"><%=label%></span>
  <span class="add-on" title = "???????????????? ???????????????? ?? ??????????????"><b class="fa fa-file-text-o"></b></span>
  <input type="text" class="tb-complect-number"  placeholder="?????????????? ??????????????????" value = "<%=number%>" style = "width:170px;" title = "?????????????? ??????????????????" />
  <input type="text" class="tb-complect-volume"  placeholder="????????????????????" value = "<%=count%>" style = "width:100px;" title = "?????????????????? ????????????????????" />
  <button style = "display:none" class = "btn btn-action btn-add" title = "???????????????? ?????? ????????????????" ><i class="fa fa-plus-circle"></i></button>
</script>-->
<script id="filterItemTemplateComplectMinus" type="text/template">
  <td>
    <input type="text" class="tb-complect-number"  placeholder="" value = "<%=number%>" style = "width:100px;" title = "?????????????? ??????????????????" />
  </td>
  <td>
    <input type="text" class="tb-complect-volume"  placeholder="????????????????????" value = "<%=count%>" style = "width:50px;" title = "?????????????????? ????????????????????" />
  </td>
  <td><%=name%></td>
  <td><%=tech_props %></td>
  <td><%=unique_props %></td>
  <td><%=Routine.rNToBr(note) %></td>
  <td><%=date_add%></td>
  <td><%=user_add%></td>
  <td><button class = "btn btn-action btn-remove" title = "?????????????? ???????????????? ???? ????????????" ><i class="fa fa-minus-circle"></i></button></td>
</script>

<div id="esud_calculation" style = "display:none">
    <!--Product Info-->
    <div  class="span12" style = "margin-top:30px; width: 98%;">
      <div class="navbar" id="navigationButtons">
        <div  id = "controlPanel"  class="navbar-inner" style=  "padding-top:10px">
          <!-- ???????? ???????????????????? ???????????????????????? ???????????? ???????????? ?? ????????????-->
          <div  id = "singleModeContainer" style="float: right"></div>

          <!-- ???????? ???????????????????? ?????????????????? ?????????????????? -->
          <div class= "line pnl-complect-filter" style = "margin: 30px 0px 10px 0px;">
            <div class = "pnl-complect-filter-body">
              <div class = "pnl-complect-filter-body-container">
                <fieldset class="collapsible collapsed">
                  <legend style="text-align: left;  font-size: 14px; font-weight: bold;"><b>??????????????????</b></legend>
                  <div class="pnl-in-info" style = "display: none">
                    <table class = 'in-info'>
                      <thead>
                        <tr>
                          <td style = "width:8%">??????????????</td>
                          <td style = "width:5%">??????-????</td>
                          <td style = "width:18%">????????????????</td>
                          <td style = "width:14%">??????. ????-????</td>
                          <td style = "width:15%">??????. ??-????</td>
                          <td style = "width:20%">????????????????????</td>
                          <td style = "width:8%">???????? ????????????????</td>
                          <td style = "width:10%">????????????</td>
                          <td style = "width:2%"></td>
                        </tr>
                      </thead>
                      <tbody class = "pnl-complect-filter-list"></tbody>
                    </table>
                    <div class = "pnl-complect-filter-controls">
                       <div class = "line">
                        <label  style = "float:left; margin: 3px 20px 0px 0px;"><input type="checkbox" style = "float:left"  class = "cb-uncomplect"> &nbsp;&nbsp;????????????????????????????????</label>
                         <input type="button" class = "btn btn-add-complect" value = "????????????????" title = "???????????????? ????????????????" />
                        <input type="button" style = "margin-left:5px;" class = "btn btn-cancel-filter" value = "????????????????" title = "???????????????? ??????????????????" />
                        <input type="button" style = "margin-left:5px;" class = "btn btn-success btn-calculate-by-specifications" value = "????????????????????" title = "???????????????????? ???????????? ???? ?????????????? ?????????????????? ????????????????????????" />
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>
            </div>
          </div>

          <!-- ???????? ???????????????????? ?????????????????? ???????????????????????? -->
          <div class= "line pnl-specification-filter" style = "display:none;margin: 10px 0px 10px 0px;">
            <div class = "pnl-specification-filter-body" style = "text-align:left;">
              <div class = "pnl-specification-filter-body-container">
                <fieldset class="collapsible ">
                  <legend style="text-align: left;  font-size: 14px; font-weight: bold;">???????????????? ??????????????</legend>
                  <div class="pnl-in-info">
                    <table class = 'in-info'>
                      <thead>
                        <tr>
                          <td style = "width:8%">??????????????</td>
                          <td style = "width:5%">??????-????</td>
                          <td style = "width:18%">????????????????</td>
                          <td style = "width:14%">??????. ????-????</td>
                          <td style = "width:15%">??????. ??-????</td>
                          <td style = "width:20%">????????????????????</td>
                          <td style = "width:8%">???????? ????????????????</td>
                          <td style = "width:10%">????????????</td>
                          <td style = "width:2%"></td>
                        </tr>
                      </thead>
                      <tbody class = "pnl-specification-filter-list"></tbody>
                    </table>
                    <div class = "pnl-specification-filter-controls">
                       <div class = "line">
                        <input type="button" class = "btn btn-add-specifications" value = "????????????????" title = "???????????????? ????????????????????????" />
                        <input type="button" style = "margin-left:5px;" class = "btn btn-cancel-filter" value = "????????????????" title = "???????????????? ????????????????????????" />
                        <input type="button" style = "margin-left:5px;" class = "btn btn-success btn-calculate-by-specifications" value = "????????????????????" title = "???????????????????? ???????????? ???? ?????????????? ?????????????????? ????????????????????????" />
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>
            </div>
          </div>
          <div class= "line" style = "margin:10px 0px 10px 0px;">
            <div class = "line pnl-calculate" style = " margin: 10px 0px 10px 0px; display:none">
              <div class = "line">
                <div class="input-prepend input-append" >
                  <label style = "float:left; margin-right:10px;"><input type="checkbox" style = "float:left;"  class = "cb-use-cut-templates"> &nbsp;&nbsp;?????????????????? ?????????????? ??????????????&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</label>
                </div>
              </div>
              <div class = "line">
                <div class="input-prepend input-append" >
                  <label style = "float:left; margin-right:10px;"><input type="checkbox" style = "float:left;"  class = "cb-use-not-returned-waste"> &nbsp;&nbsp;???????????????????????????? ???????????????????????? ?????????? ???? ??????????????&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</label>
                </div>
              </div>
              <div class = "line">
                <div class="input-prepend input-append" >
                  <label style = "float:left; margin-right:10px;"><input type="checkbox" style = "float:left;"  class = "cb-use-returned-waste"> &nbsp;&nbsp;???????????????????????????? ???????????????????? ?????????? ???? ??????????????&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</label>
                </div>
              </div>
              <div class = "line">
                <div class="input-prepend input-append" >
                  <label style = "float:left; margin-right:10px;"><input type="checkbox" style = "float:left;"  class = "cb-send-to-google"> &nbsp;&nbsp;?????????????????? ?? GOOGLE&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</label>
                </div>
              </div>
              <div class = "line" style = "margin-top:10px;">
                <div class="input-prepend input-append" >
                  <label style = "float:left; margin-right:10px;"><input type="checkbox" style = "float:left;"  class = "cb-use-stock"> &nbsp;&nbsp;???????????? ????????????????</label>
                  <input type="text" class="tb-stock-order-number"  placeholder="?????????? ????????????" value = "" disabled style = "width:100px;" />
                </div>
              </div>
            </div>
            <div class = "line pnl-to-product" style = "margin-top:20px; display:none">
              <div class="input-prepend input-append" >
                <span class="add-on"><b class="fa fa-cart-plus"></b>&nbsp;??????????:</span>
                <input type="text" class="tb-order-number"  placeholder="?????????? ????????????" value = "" disabled />
                <button class="btn btn-success btn-to-develop" id = "btn_to_develop" disabled >?? ????????????????????????</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id = "esud_calculation_body" class="data-body" style = "min-height:500px;">
      <div class="tabbable">
        <ul class="nav nav-tabs">
            <li style = "display: none"><a href="#tab-plan-norms" data-toggle="tab">?????????? ??????????????</a></li>
            <li class="active"><a href="#tab-calculation" data-toggle="tab">?????????????? ????????????????</a></li>
            <li><a href="#tab-task-to-produce" data-toggle="tab">?????????????? ??????????????????????</a></li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane active" id="tab-calculation">
                <div class = "line data-container"  id = "esud_calculation_data_container" style = "overflow: hidden;"></div>
            </div>
            <div class="tab-pane" id="tab-task-to-produce">
              <div class = "line data-container"  id = "esud_task_to_product_data_container"></div>
            </div>
            <div class="tab-pane" id="tab-plan-norms">
              <div class = "line data-container"  id = "esud_plan_norms_data_container"></div>
            </div>
      </div>
    </div>
  </div>
</div>
