var preloader = {
      Show:function(){
         $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
      },
      Hide:function(){
        $.unblockUI();
      }
  }


  // чтобы чебокс сразу срабатывал
  var BooleanCellEx = Backgrid.BooleanCell.extend({
    enterEditMode:function(){
      BooleanCellEx.__super__.enterEditMode.apply(this);
      this.model.set(this.column.get("name"),!this.model.get(this.column.get("name")));
      this.exitEditMode();
    }
  });

  // для хидера чекбоксов (чтобы выделить все)
  var BooleanHeaderEx =  Backgrid.HeaderCell.extend({
    events: {
      "change input[type=checkbox]": "onChange"
    },
    onChange:function(){
      var ch = this.$el.find("input").prop("checked");
      var column = this.column;
      this.collection.each(function (model) {
        model.set(column.get("name"),ch);
      });
    },
    render:function(){
      if(this.column.get("label")!="")
        BooleanHeaderEx.__super__.render.apply(this);
      this.$el.append('<input type="checkbox" />');
      return this;
    }
  });