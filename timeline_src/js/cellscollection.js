define([
    'jquery',
    'underscore',
    'backbone',
    'd3',
    'global'
], function($, _, Backbone, d3, G)
{
    //
    // CELL MODEL --------------------------------------------------------------
    //
    var CellModel = Backbone.Model.extend({

        idAttribute: "_id",

        url: '/timeline/api/cells',
        url_visitors: '/timeline/api/cells/visitors',

        defaults: {
            _id: null,
            node_id: null,
            date: null,
            comments: []            
        },

        // initialize: function() {
        //     this.on('all', function(e) { console.log('→ CellModel', e); });
        // },

        toJSON: function() {
            // parse date to day-string
            var attributes = _.clone(this.attributes);
            attributes.date = d3.time.format('%Y-%m-%d')(attributes.date);
            return attributes;
        },

        parse: function(resp) {
            // parse date-string to the day-date
            resp.date = d3.time.day(new Date(resp.date.split('T')[0]));
            _.forEach(resp.comments, function(comment) { comment.created_at = new Date(comment.created_at); });            
            return resp;
        },

        addComment: function(comment) {
            var self = this,
                cell = this,
                comments = this.get('comments');
            comments.push(comment);

            if (!this.sendingQueue) {
                this.sendingQueue = [];
            }
            this.sendingQueue.push(comment);

            this.save({}, { success: function(model, response) {
                // remove comment from sending queue
                self.sendingQueue = self.sendingQueue.filter(function(c) {
                    return c !== comment;
                });
                cell.updateVisitor(_.last(_.where(response.comments, comment)).created_at);
            } });
        }, // addComment

        updateVisitor: function(seenAt) {
            var self = this;
            $.ajax({
                url: this.url_visitors,
                type: 'PUT',
                data: JSON.stringify({
                    cell_id: this.id,
                    user: G.currentUser,
                    seen_at: seenAt
                }),
                dataType: 'json',
                processData: false,
                contentType: 'application/json',
                success: function(resp) {                                        
                    self.seen_at = Routine.convertStrToDateWithTimezone(resp.seen_at);//new Date(resp.seen_at);                                        
                    self.collection.trigger('change');
                },
                error: function() { console.warn('can’t save visit', arguments); }
            });
        }
    }); // CellModel



    //
    // CELLS COLLECTION ---------------------------------------------------------
    //
    var CellsCollection = Backbone.Collection.extend({
        model: CellModel,

        url: '/timeline/api/cells',
        url_visitors: '/timeline/api/cells/visitors',

        initialize: function() {
            // debug
            // this.on('all', function(e) { console.log('→ CellCollection', e); });

            this.fetch({
                reset: true,
                success: function(collection) {
                    var loadVisits = function(user) {
                        $.ajax({
                            url: collection.url_visitors + "/" + user,
                            contentType: "application/json; charset=utf-8",
                            success: function(visits) {
                                visits.forEach(function(visit) {
                                    collection.get(visit.cell_id).seen_at = Routine.convertStrToDateWithTimezone(visit.seen_at);
                                });
                                collection.trigger('change');
                            },
                            error: function() { console.warn('can’t load visits', arguments); }
                        });
                    };
                    if (G.currentUser) {
                        loadVisits(G.currentUser);
                    } else {
                        // wait for user_id
                        G.events.on("userid:usermodel", loadVisits);
                    }
                },
                error: function() { console.log('can’t fetch cells collection'); }
            });
        }
    });



    return CellsCollection;
});
