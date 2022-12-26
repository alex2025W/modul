%def scripts():
 <link href="/static/css/selectize.bootstrap2.css" rel="stylesheet" media="screen, print">
 <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
 <script src="/static/scripts/routine.js?v={{version}}"></script>

<style>
    .small-grey{
        font-size: 11px;
        color: #ccc;
    }
    #correspondent-dropdown{
        position: relative;
    }
    #corr-dropdown-menu{
    }
    #corr-dropdown
    .bootbox-confirm.modal{
        width:450px;
        margin-left:-175px;
    }
</style>
<script>
  $(function(){
    bootbox.setDefaults({locale: "ru",});
    window.DICTS = {};
    window.MANAGERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in users])}} };
    window.DICTS.outgoing_type = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 15])}}];
});
</script>
<script src="/static/scripts/libs/selectize.js?v={{version}}"></script>
<script src="/static/scripts/report/build/app.js?v={{version}}"></script>
%end


%rebase master_page/base page_title='Исходящие', current_user=current_user, version=version, scripts=scripts, menu=menu

<div id="outgoing-page" class="span12">
    <div class="row">
        <div id="outgoing-form" class="span12"></div>
    </div>
    <div class="row">
        <div id="outgoing-table" class="span12"></div>
    </div>
</div>


