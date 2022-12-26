///
/// Представление технологической карты заказа
///
App.Views.TechnoMapView = Backbone.View.extend({
    tagName:'table',
    className:'techno-map-table',
    data: null, // данные по технологической карте
    last_selected_item: null,

    templates: {
        map:_.template($("#technoMapTableTemplate").html()),
    },
    events:{
        'mousedown td': 'onItemMouseDown',
        'mouseover td': 'onItemOver',
        'mouseout td': 'onItemOut',
    },
    /**
     * Инициализация
    **/
    initialize: function()
    {

    },
    prepare_data:function(data){
        // сначала пробегаем по дереву, и прописываем количество строк, которые необходимо объединить
        function add_rowspan(node){
            if(node['children'].length==0){
                node['rowspan'] = 1;
                return 1;
            }
            else
            {
                var cnt = 0;
                for(var i in node['children']){
                    cnt+=add_rowspan(node['children'][i]);
                }
                node['rowspan'] = cnt;
                return cnt;
            }
        }

        // заполнить ячейку таблицы
        function set_cell(table, node, eclass, couter, row_index){
            var tid = counter.cnt++;
            table[row_index][node['level']] = {'node':node, 'rowspan':node['rowspan'], 'is_visible':true, "tree_id":tid, "eclass":eclass+" tde"+tid};
            for(var k=1;k<node['rowspan'];++k){
                table[row_index+k][node['level']] = {'is_visible':false};
            }
            var i_index = row_index;
            for(var i in node['children'])
            {
                i_index+=set_cell(table, node['children'][i], eclass+" tde"+tid, counter, i_index);
            }
            return node['rowspan'];
        }

        var row_count = 0;
        for(var c in data['tree']){
            add_rowspan(data['tree'][c]);
            row_count+=data['tree'][c]['rowspan'];
        }

        // создается таблицы из всех элементов
        var table = [];
        data['operations'].unshift({'name':'Выход'});
        for(var t=0;t<row_count;++t){
            table.push(Array(data['operations'].length));
        }

        var i_index = 0;
        // Заполняем таблицу
        var counter = {"cnt":0};
        for(var c in data['tree']){
            i_index+=set_cell(table,data['tree'][c],"",counter,i_index);
        }

        // делаются невеидимыми ячейки, где есть объединение
        for(var i=0;i<table.length;++i){
            var vis = true;
            var trow = 1;
            var is_arr = false;
            var eclass = "";
            for(var j=table[i].length-1;j>=0;--j){
                if(table[i][j]){
                    if(!table[i][j].is_visible){
                        vis = false;
                    }else{
                         trow = table[i][j].rowspan;
                         eclass = table[i][j].eclass;
                         is_arr = true;
                    }
                }else
                    table[i][j] = {'is_visible':vis, 'rowspan':trow, "is_arr":is_arr,"eclass":eclass};
            }
        }
        return {'table':table, 'operations':data['operations']};
    },

    /**
     * Удление представления
    **/
    unRender: function()
    {
        this.remove();
    },

     /**
     * Отрисовка элемента
    **/
    render: function (data) {
        this.$el.empty();
        this.data = data;
        var prepared_data = this.prepare_data(this.data);
        this.$el.html(this.templates.map(prepared_data));
        return this;
    },


    /**
    ** Указатель мыши над элементом
    **/
    onItemOver: function(e)
    {
        var self = this;
        var td = e.currentTarget;
        var ind = $(td).index();
        self.$el.find("td.tde"+$(td).data("treeid")).each(function(){
                if($(this).index()<=ind)
                    $(this).addClass("over");
        });
    },

    /**
    ** Указатель мыши убрали с элемента
    **/
    onItemOut: function(e)
    {
        var self = this;
        var td = e.currentTarget;
        var ind = $(td).index();
        self.$el.find("td.over").removeClass("over");
    },

    /**
    ** Клик по элементу
    **/
    onItemMouseDown: function(e)
    {
        var self = this;
        var td = e.currentTarget;
        var ind = $(td).index();
        self.$el.find("td.over").removeClass("over");
        // если кликнули по тому же элементу
        if(this.last_selected_item == td)
        {
            this.last_selected_item = null;
            self.$el.find("td.selected").removeClass("selected");
            return;
        }
        self.$el.find("td.selected").removeClass("selected");
        self.$el.find("td.tde"+$(td).data("treeid")).each(function(){
                if($(this).index()<=ind)
                    $(this).addClass("selected");
        });

        this.last_selected_item = td;
    },

    onScroll:function(x,y){
        this.$el.find("div.header").css("top",y+"px");
    }
});
