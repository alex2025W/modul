/**
    * контакт из таблицы контактов
    */

var contactTableItemTemplate = require('../templates/contact_table_item_template.html');

    var ContactTableItemView = Backbone.View.extend({
        tagName:'tr',
        parentView: null,
        events:{
            'click .remove-contact': 'remove',
            'click .edit-contact': 'edit',
            'click .lnk-phone': 'onPhoneClick'
        },
        initialize:function(){
            this.template = contactTableItemTemplate;

        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        remove:function(){
            if (confirm("Контакт будет удален из базы. Продолжить?")){
                this.model.destroy();
                // TODO: Check that no more dependencies than refresh
                // this.parentView.saveContact();
            }
        },
        edit:function(){
            this.parentView.editContact(this.model);
        },

        /**
        ** Обработка события клика по телефону в карточке клиента.
        ** По клику происходит попытка дозвона данному клиенту
        **/
        onPhoneClick: function(e){
            //console.log(this.model.toJSON());
            // преобразовать телефон к формату: 89056589856
            var phone = Routine.convertPhone($(e.target).html());
            console.log(phone);
            // проверить полученный формт телефона
            if(phone.length==11 && phone[0]=='8')
            {
                // получить внутренний номер текущего менеджера
                var manager_phone  = glCurUser.inner_phone;
                if(!manager_phone)
                {
                    $.jGrowl("Для вас не задан внутренний телефон.", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                    return;
                }
                $.jGrowl("Попытка дозвона на телефон: " + phone, { 'themeState':'growl-success', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                $.post('/handlers/call', {phone, manager_phone})
                    .done(data => {

                });
                //Авторизация для звонка - http://88.198.197.122:8089/ascrm/rawman?action=login&username=ascrm&secret=29ULLB83FM4DJkSf58Jq
                //URL для звонка: http://88.198.197.122:8089/ascrm/rawman?Action=Originate&Channel=SIP/200&Context=DLPN_Moscow&Exten=89602737132&Priority=1&Context=CallingRule_Moscow_all_8X&Async=true
            }
            else
                $.jGrowl("Неверный формат телефона:  " + phone, { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
        }
    });

module.exports = ContactTableItemView;
