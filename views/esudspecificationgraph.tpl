% def styles():
    <link href="/static/specificationtreegraph/css/html.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/specificationtreegraph/css/html-print.css?v={{version}}" rel="stylesheet" media="print">
    <link href="/static/specificationtreegraph/css/svg.css?v={{version}}" rel="stylesheet" media="all">
    <link href="/static/specificationtreegraph/css/svg-print.css?v={{version}}" rel="stylesheet" media="print">
% end

% def scripts():
    <script src="/static/scripts/libs/d3.v3.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/lodash.min.js?v={{version}}"></script>
    <script src="/static/specificationtreegraph/js/app.js?v={{version}}"></script>
    <script src="/static/scripts/libs/base64.js?v={{version}}"></script>
    <script src="/static/scripts/libs/b64.js?v={{version}}"></script>
    <script src="/static/scripts/libs/rawdeflate.js?v={{version}}"></script>
    <script src="/static/scripts/user_controls/queue.js?v={{version}}"></script>
    <script src="/static/scripts/routine.js?v={{version}}"></script>
% end

% rebase master_page/base page_title='Граф данных, спецификация', current_user=current_user, version=version, styles=styles, scripts=scripts, menu=menu

<h1 id="print-header"></h1>
<svg id="print-fixin" style="display: none"><rect width="99999" height="99999"></rect></svg>

<div id="spinner" class="bounce" style = "display:none">
  <div class="double-bounce1"></div>
  <div class="double-bounce2"></div>
</div>

<svg id="canvas"></svg>
