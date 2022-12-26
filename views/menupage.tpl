%def scripts():
%end
%rebase master_page/base page_title='Доступные страницы.', current_user=current_user, version=version, menu=menu, scripts=scripts
<div id="menucontent">
  %for p in menu:
    <div class="btn-group"><a class="btn btn-default" href="{{p['url']}}">{{p['title']}}</a></div>
  %end
  </div>
  </div>
</div>
