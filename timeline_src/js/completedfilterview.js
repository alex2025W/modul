define([
    'backbone',
    'global'
], function(Backbone, G) {

    var CompletedFilterView = Backbone.View.extend({
        el: '#completed-filter',

        events: {
            'click a': 'filter'
        },

        initialize: function() {
            this.$el.show();
            G.router.on("route:applyDatamining", this.render, this);
        },

        render: function() {
            this.$el.find('a').removeClass('selected');
            this.$el.find("a[href=#" + this.model.hideCompletedDepth + "]")
                .addClass('selected');
        },

        filter: function(e) {
            /*var desiredSortType = e.target.hash.slice(1),
                desiredSortOrderIsDesc = !$(e.target).data('desc');
            G.router.navigateSmart({ completed_filter: (desiredSortOrderIsDesc ? '!' : '') + desiredSortType }, { trigger: true }); */
            //console.log(this.model);
            //$(e.target).addClass('selected');            
            if($(e.target).hasClass('selected')){
                G.router.navigateSmart({ completed_filter: 'off' }, { trigger: true });
                e.preventDefault(); 
            }else{
                //$(e.target).addClass('selected');
                //setTimeout(function(){
                var depth = $(e.target).data('depth');                
                G.router.navigateSmart({ completed_filter: depth }, { trigger: true });                    
                //},100);
                e.preventDefault(); 
            }
        },

        dummy: null
    });

    /*var CompletedFilterView = Backbone.View.extend({
        el: '#completed-filter',

        events: {
            'click button.switch': 'toggleFilter',
            'click ul.dropdown-menu a': 'changeDepth'
        },

        initialize: function() {
            this.$checkbox = this.$el.find('.switch');
            this.$select = this.$el.find('.dropdown-toggle');

            this.$el.show();
            G.router.on("route:applyDatamining", this.render, this);
        },

        render: function(dummySort, completed) {
            if (completed !== 'off') {
                this.$checkbox
                    .addClass('active')
                    .data('hide-completed', true);

                this.$select.find('.label').text(
                    this.$el.find('ul.dropdown-menu a[href=#' + completed + ']').text().toLocaleLowerCase()
                );
                this.$select
                    .removeClass('disabled')
                    .data('depth', completed);
            } else {
                this.$select.addClass('disabled');
                this.$checkbox
                    .removeClass('active')
                    .data('hide-completed', false);
            }
        },

        toggleFilter: function(e) {
            var button = $(e.target).closest('button'),
                depth;
            if (button.data('hide-completed')) {
                depth = 'off';
            } else {
                depth = this.$select.data('depth');
            }

            button.blur();
            e.preventDefault();

            // spinner
            //
            var icon = button.find('span');
            var iconClassBeforeSpinner = icon[0].className;
            // run spinner
            icon[0].className = 'glyphicon glyphicon-refresh spinning';
            button.attr('disabled', true);
            $('html>body').addClass('waiting');
            // and call long-running operation on the separate thread
            // so the button with spinner have time to redraw
            setTimeout(function() {
                // this operation hungs out UI for a while
                G.router.navigateSmart({ completed_filter: depth }, { trigger: true });
                // as soon as long-running operation is finished restore button
                // icon to the previous state
                icon[0].className = iconClassBeforeSpinner;
                button.removeAttr('disabled');
                $('html>body').removeClass('waiting');
            }, 100);
        },

        changeDepth: function(e) {
            var depth = $(e.target).data('depth');
            G.router.navigateSmart({ completed_filter: depth }, { trigger: true });
            e.preventDefault();
        },

        dummy: null
    }); */

    return CompletedFilterView;
});
