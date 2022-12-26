var ContactCollection = require('../collections/contact_collection');
var HistoryWorkStatusCollection = require('../collections/history_work_status_collection');
var PodpisantCollection = require('../collections/podpisant_collection');

var ClientModel = Backbone.Model.extend({
        urlRoot:'/handlers/client',
        defaults:{
          'id': '',
          'name':'',
          'addr':'',
          'site':'',
          'site_status':'',
          'site_date':'',
          'rekvisit':'',
          'inn':'',
          'cl':'notcl',
          'wherefind':'',
          'firstcontact':'',
          'type':'',
          'contacts': new ContactCollection(),
          'podpisants' : new PodpisantCollection(),
          'agent': false,
          'customers':[],
          'comment': '',
          'current_work_status': {'status':'active', 'note': ''},
          'history_work_status': new HistoryWorkStatusCollection(),
          'tags': []
        },

        initialize: function(){
            this.set('contacts', new ContactCollection());
            this.set('podpisants', new PodpisantCollection());
            if(this.get('history_work_status'))
                this.set('history_work_status', new HistoryWorkStatusCollection(this.get('history_work_status').models));
            else
                this.set('history_work_status', new HistoryWorkStatusCollection());
        },

        parse: function(response) {
            var historyList = new HistoryWorkStatusCollection();
            historyList.add(response.history_work_status);

            var contactList = new ContactCollection();
            contactList.add(response.contacts);
            var podpisants = new PodpisantCollection(response.podpisants || [])
            return {
                'id':response.id,
                'name': response.name,
                'addr': response.addr,
                'site': response.site,
                'site_status': response.site_status,
                'site_date': response.site_date,
                'wherefind': response.wherefind,
                'firstcontact': response.firstcontact,
                'cl': response.cl,
                'rekvisit': response.rekvisit,
                'inn': response.inn,
                'type': response.type,
                'contacts': contactList,
                'agent': response.agent || false,
                'customers': response.customers || [],
                'comment': response.comment || '',
                'current_work_status': response.current_work_status || '',
                'history_work_status': historyList,
                'tags': response.tags || [],
                'podpisants': podpisants
            }
        }
    });

module.exports = ClientModel;
