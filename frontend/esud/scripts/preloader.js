///
/// Прелоадер, со счетчиком открытых и  закрытых спинеров.
///
var AppLoader = {
    counter: 0,
    show: function(){
        if(this.counter==0)
        {
            Routine.showLoader();
            this.counter++;
        }
        else
            this.counter++;
    },
    hide:function(){
        if(this.counter==1)
        {
            Routine.hideLoader();
            this.counter--;
        }
        else if(this.counter>0)
            this.counter--;
    }
};
