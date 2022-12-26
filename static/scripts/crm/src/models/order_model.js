var HistoryCollection = require('../collections/history_collection');
var TaskCollection = require('../collections/task_collection');
var ProductCollection = require('../collections/product_collection');
var ServiceCollection = require('../collections/service_collection');
var PodpisantCollection = require('../collections/podpisant_collection');

var getloc = require('../utils/getloc');

var OrderModel = Backbone.Model.extend({
        urlRoot:'/handlers/order',
        defaults:{
            'id':'',
            'number':'',
            'documents': null,
            'client_id':'',
            'client_info':'',
            'total_address' :'',
            'total_montaz' : '',
            'markup' : 0,
            'total_delivery':'',
            'total_shef_montaz' : 'no',


            'correspondent': '',
            'client':'',
            'condition': '',
            'condition_type':'',
            'task':'0',
            'task_count':0,
            'task_date':'',
            'datetime':'',
            'manager':'',
            'structure':'—',
            'price':0,
            'approx':'no',
            'approx_sq':'no',
            'closed':'no',
            'chance':0,
            'comment':'—',
            'chance_str':'—',
            'sq':0,
            'state': 'published',
            'favorite':'off',
            'f_state':'',
            'f_state_date':'',
            'l_state':'',
            'l_state_reason':'',
            'l_state_date':'',
            'prelast_state':'',
            'prelast_state_date':'',
            //----------
            'last_close_date':'',
            'cur_close_date':'',
            'close_date':'',
            'close_days_count':null,
            'confirmed_by_client':false,
            //----------
            'last_finish_date':'',
            'cur_finish_date':'',
            'finish_date':'',
            'finish_days_count':null,
            'finish_confirmed_by_client':false,

            'history': new HistoryCollection(),
            'tasks': new TaskCollection(),
            'products': new ProductCollection(),
            'cur_manager': window.MANAGER,
            'last_days_count':null,
            'prelast_days_count':null,

            'ignore_state_date': 'no',
            'l_state_date_short':0,
            'prelast_state_date_short':0,
            'f_state_date_short':0,
            'diff_last_prelast_days_count':0,
            'is_tender':'no',
            'dogovornum':'',
            'contracts':[],
            'linked_orders':[],
            'services': null,
            'f_state_manager': '',
            'prelast_state_manager': '',
            'l_state_manager': '',
             'f_state_initiator': '',
            'prelast_state_initiator': '',
            'l_state_initiator': '',
            'projects':[],
            'podpisants':new PodpisantCollection(),
            'abc_type': null,
            'activity': 0,
            'activity_significant': 0,
            'activity_percent': 0,
        },
        initialize: function(){
            if(this.get('podpisants'))
                this.set('podpisants', new PodpisantCollection(this.get('podpisants').models));
            else
                this.set('podpisants', new PodpisantCollection());

            if(this.get('history'))
                this.set('history', new HistoryCollection(this.get('history').models));
            else
                this.set('history', new HistoryCollection());
            if(this.get("tasks"))
                this.set('tasks', new TaskCollection(this.get('tasks').models ));
            else
                this.set('tasks', new TaskCollection());
            if(this.get("products"))
                this.set('products', new ProductCollection(this.get('products').models ));
            else
                this.set('products', new ProductCollection( ));
            if(this.get("services"))
                this.set('services', new ServiceCollection(this.get('services').models));
            else
                this.set('services', new ServiceCollection());
        },
        parse: function(response) {

            var productList = new ProductCollection();
            productList.add(response.products);

            var historyList = new HistoryCollection();
            historyList.add(response.history);

            var serviceList = new ServiceCollection();
            if (response.services != undefined){
                serviceList.add(response.services);
            }

            var taskList = new TaskCollection();
            taskList.add(response.tasks);

            var tsk = response.task;
            if (tsk == ''){
                tsk = '0';
            }

            var dt = getloc(response.datetime);
            return{
                'id': response.id,
                'number': response.number,
                'documents': response.documents,
                'client_id': response.client_id,
                'client_info': response.client_info,
                'total_address' : response.total_address,
                'total_montaz' : response.total_montaz,
                'markup' : response.markup || 0,
                'total_delivery': response.total_delivery,
                'total_shef_montaz' : response.total_shef_montaz,
                'correspondent': response.correspondent,
                'client': response.client,
                'client_group': response.client_group,
                'task': tsk,
                'task_count': response.task_count,
                'task_date': response.task_date,
                'datetime': dt,
                'condition': response.condition,
                'condition_type': response.condition_type,
                'manager': response.manager,
                'structure': response.structure,
                'price': response.price,
                'approx': response.approx,
                'approx_sq': response.approx_sq,
                'closed': response.closed,
                'chance': response.chance,
                'comment': response.comment,
                'chance_str': response.chance_str,
                'sq': response.sq,
                'state': response.state,
                'favorite': response.favorite,
                'f_state': response.f_state,
                'f_state_date': response.f_state_date,
                'l_state':response.l_state,
                'l_state_reason':response.l_state_reason,
                'l_state_date':response.l_state_date,
                'prelast_state':response.prelast_state,
                'prelast_state_date':response.prelast_state_date,

                //--------
                'last_close_date':response.last_close_date,
                'cur_close_date':response.cur_close_date,
                'close_date': response.close_date,
                'close_days_count':response.close_days_count,
                'confirmed_by_client':response.confirmed_by_client,
                //--------
                'last_finish_date':response.last_finish_date,
                'cur_finish_date':response.cur_finish_date,
                'finish_date': response.finish_date,
                'finish_days_count':response.finish_days_count,
                'finish_confirmed_by_client':response.finish_confirmed_by_client,

                products: productList,
                history: historyList,
                tasks: taskList,
                services: serviceList,
                'last_days_count':response.last_days_count,
                'prelast_days_count':response.prelast_days_count,

                'ignore_state_date':response.ignore_state_date,
                'l_state_date_short':response.l_state_date_short,
                'prelast_state_date_short':response.prelast_state_date_short,
                'f_state_date_short':response.f_state_date_short,
                'diff_last_prelast_days_count': response.diff_last_prelast_days_count,
                'is_tender': response.is_tender,
                'dogovornum': response.dogovornum,
                'change_comment':response.change_comment,
                'contracts':response.contracts || [],
                'linked_orders':response.linked_orders || [],
                'f_state_manager': response.f_state_manager,
                'prelast_state_manager': response.prelast_state_manager,
                'l_state_manager': response.l_state_manager,
                'f_state_initiator': response.f_state_initiator,
                'prelast_state_initiator': response.prelast_state_initiator,
                'l_state_initiator': response.l_state_initiator,
                'projects':response.projects || [],
                'abc_type': response.abc_type,
                'activity': response.activity,
                'activity_significant': response.activity_significant,
                'activity_percent': response.activity_percent
            };
        }
    });

module.exports = OrderModel;
