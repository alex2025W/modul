var GOOGLE_ANALITICS_CODE = "UA-78411234-1";
var ga = null;

$(function(){
	$("body").append("<script>(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');ga('create', '"+GOOGLE_ANALITICS_CODE+"', 'auto', {'userId':'"+ MANAGER_ID+"'});ga('send', 'pageview');</script>")
});


var Statistics={
	CRMChangeState:function(task_number, new_state, user_email){
		try{
			if(ga){			
				ga('send', 'event', "CRM", "State", "Изменение состояния заявки", 1);
			}
		}catch(ex){
			
		}
	}
};