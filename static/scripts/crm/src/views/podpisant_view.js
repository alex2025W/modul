/**
* список подписантов клиента
*/

var podpisantListTemplate = require('../templates/podpisant_template.html');
var PodpisantModel = require('../models/podpisant_model');

 var PodpisantListView = Backbone.View.extend({
 	added_elem:null,
 	initialize:function(){
		this.template = podpisantListTemplate;
		this.render();
	}/*,
	events:{
		'click .new-podpisant':'onPodpisantAdd',
		'click .remove-popdisant':'onPodpisantRemove'
	}*/,
	render: function() {
		var self = this;
		this.renderPreloader();
		if(this.options.client.get("id")){
			$.ajax({
        type: "GET",
        url: "/handlers/client/podpisants/"+this.options.client.get('id'),
        data: {},
        timeout: 55000,
        contentType: 'application/json',
        dataType: 'json',
        async:true
        }).done(function(result) {
            self.renderData(result);
        }).fail(function(jqXHR, textStatus, errorThrown ) {
        	self.renderData([]);
        });
    }else
    	self.renderData([]);
		/*this.$el.html(this.template({'podpisants':this.collection.toJSON()}));
		var el = this.$('.new-podpisant-name');
		var self = this;
		var handler = function(cln){
			self.added_elem = cln;
		}
		$(el).clientFinder({onSelect: handler,url:'/handlers/clientnamefind/?q=%QUERY',  formatTemplate:function(data){   return '<div data-id="' + data.id + '" class="tt-suggestion tt-selectable">'+data.name +'</div>';}});
		$(el).on('change',function(){
			self.added_elem = null;
		});*/
	},
	renderPreloader:function(){
		this.$el.html(this.template());
	},
	renderData:function(data){
		this.$el.html(this.template(data));
	}
	/*,
	onPodpisantAdd:function(e){
		if(this.added_elem){
			var eid = this.added_elem.id;
			var is_find = false;
			this.collection.each(function(d){
				if(eid==d.get('_id'))
					is_find = true;
			});
			if(!is_find)
				this.collection.add(new PodpisantModel({'_id':this.added_elem.id, 'name':this.added_elem.name, 'addr':this.added_elem.addr}));
		}
		else
			this.collection.add(new PodpisantModel({'_id':"new_"+Guid.newGuid(), 'name':this.$('.new-podpisant-name.tt-input').val()}));
		this.render();
	},
	onPodpisantRemove:function(e){
		var id = $(e.currentTarget).data('id');
		this.collection.remove(this.collection.where({'_id':id}));
		this.render();
	}*/
});

 module.exports = PodpisantListView;
