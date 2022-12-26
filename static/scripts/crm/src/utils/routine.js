module.exports = {
    //
    // функция проверки корректности введенной даты
    //
    isValidDateTime: function (date) {
        function parseDate(input, format) {
            format = format || 'dd/mm/yyyy h:i'; // default format
            var parts = input.match(/(\d+)/g),
              i = 0, fmt = {};
            // extract date-part indexes from the format
            format.replace(/(yyyy|dd|mm|h|i)/g, function (part) { fmt[part] = i++; });

            var dt = new Date(parts[fmt['yyyy']], parts[fmt['mm']] - 1, parts[fmt['dd']], parts[fmt['h']], parts[fmt['i']]);

            if ((parts[fmt['dd']] == dt.getDate()) && (parts[fmt['mm']] - 1 == dt.getMonth()) && (parts[fmt['yyyy']] == dt.getFullYear()) && (parts[fmt['h']] == dt.getHours()) && (parts[fmt['i']] == dt.getMinutes()))
                return true;
            else
                return false;
        }

        tmp = parseDate(date);
        if (tmp && tmp != "Nan")
            return true;
        else
            return false;
    },

    add_work_days: function(date, count){
        var new_date = undefined;
        var i = 1;

        while (i <= count){
            new_date = date.add('d', 1);
            if (window.WEEKENDS.indexOf(new_date.format('YYYY-MM-DD')) > -1){
                count++;
            }
            i++;
        }
        return new_date
    },

    //
    // функция проверки корректности емайл адреса
    //
    isValidEmail: function (email) {
        return (/^([a-z0-9_\-]+\.)*[a-z0-9_\-]+@([a-z0-9][a-z0-9\-]*[a-z0-9]\.)+[a-z]{2,4}$/i).test(email);
    },

    isValidUrl: function(val)
    {
        if(val)
          return (/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+(:[0-9]+)?|(?:ww‌​w.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?‌​(?:[\w]*))?)/).test(val);
      return false;
    },

    //
    // функция копирования объекта
    //
    copyObject: function (val) {
      if(val)
        return JSON.parse(JSON.stringify(val));
      return null;
    },

    //
    // Функция преобразования строки к дате со временем
    //
     parseDateTime:function(input, format) {
            if(!input) return false;
            format = format || 'dd/mm/yyyy h:i'; // default format
            var parts = input.match(/(\d+)/g),
              i = 0, fmt = {};
            // extract date-part indexes from the format
            format.replace(/(yyyy|dd|mm|h|i|s)/g, function (part) { fmt[part] = i++; });

            var dt = new Date(parts[fmt['yyyy']], parts[fmt['mm']] - 1, parts[fmt['dd']], parts[fmt['h']], parts[fmt['i']], parts[fmt['s']]);

            if ((parts[fmt['dd']] == dt.getDate()) && (parts[fmt['mm']] - 1 == dt.getMonth()) && (parts[fmt['yyyy']] == dt.getFullYear()) && (parts[fmt['h']] == dt.getHours()) && (parts[fmt['i']] == dt.getMinutes()) && (parts[fmt['s']] == dt.getSeconds()) )

                return dt;
            else
                return false;
     },

    //
    // функция преобразования строки к дате
    //
    parseDate:function(input, format) {
          if(!input) return false;
            format = format || 'dd/mm/yyyy'; // default format
            var parts = input.match(/(\d+)/g),
              i = 0, fmt = {};
            // extract date-part indexes from the format
            format.replace(/(yyyy|dd|mm)/g, function (part) { fmt[part] = i++; });

            var dt = new Date(parts[fmt['yyyy']], parts[fmt['mm']] - 1, parts[fmt['dd']]);

            if ((parts[fmt['dd']] == dt.getDate()) && (parts[fmt['mm']] - 1 == dt.getMonth()) && (parts[fmt['yyyy']] == dt.getFullYear()) )
                return dt;
            else
                return false;
        },

     //
     // функция проверки корректности даты
     //
    isValidDate: function (date) {
        function parseDate(input, format) {
            format = format || 'dd/mm/yyyy'; // default format
            var parts = input.match(/(\d+)/g),
              i = 0, fmt = {};
            // extract date-part indexes from the format
            format.replace(/(yyyy|dd|mm)/g, function (part) { fmt[part] = i++; });

            var dt = new Date(parts[fmt['yyyy']], parts[fmt['mm']] - 1, parts[fmt['dd']]);

            if ((parts[fmt['dd']] == dt.getDate()) && (parts[fmt['mm']] - 1 == dt.getMonth()) && (parts[fmt['yyyy']] == dt.getFullYear()) )
                return true;
            else
                return false;
        }
        var tmp = parseDate(date);
        if (tmp && tmp != "Nan")
            return true;
        else
            return false;
    },

   //
   //Конвертация строковой даты из формата dd/mm/yyyy в yyyy/mm/dd
   //
   prepareDate: function(strDate)
   {
          if(strDate!="")
          {
            var dateParts = strDate.split("/");
            return dateParts[2]+"/"+(dateParts[1]) +"/"+ dateParts[0];
          }
          return "";
   },

   //
   // Получение Array заполненого числами по заданному диапазону
   //
   range:function(start, end)
   {
      var foo = [];
      for (var i = start; i <= end; i++) {
          foo.push(i);
      }
      return foo;
  },

   //
   // Получение списка годов
   // start - количество годов которые необходимо отнять от текущего
   // end - количество годов которые необходимо прибавить к текущему
   //
   getRangeYears: function(start, end)
   {
      var curYear = new Date().getFullYear();
      var startYear = curYear - start;
      var endYear = curYear + end;
      return Routine.range(startYear, endYear);
   },

    //
    // Конвертация даты к UTC
    //
   convertToUTC: function(val)
   {
      return new Date(val.getTime() + val.getTimezoneOffset()*60000 );
   },

   //
   // Разница между двумя датами в днях
   //
   daysDiff : function(date1, date2)
   {
      if(date1 && date2)
      {
          var timeDiff = date1.getTime() - date2.getTime();
          var tmpDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
          return tmpDays;
      }
      return 0;
   },

   //
   // обнуление времени в дате
   //
   timeToZero: function(val)
   {
      val = new Date(val.setHours(0));
      val = new Date(val.setMinutes(0));
      val = new Date(val.setSeconds(0));
      val = new Date(val.setMilliseconds(0));
      return val;
   },

   //
   // Преобразрвание сторки в целое число
   //
   strToInt: function(str)
   {
      var tmp = parseInt(str);
      if (tmp && !isNaN(tmp))
            return tmp;
      else
            return 0;
   },

   //
   // Преобразрвание сторки в вещественное число
   //
   strToFloat: function(str)
   {
      str = str.replace(',','.');
      var tmp = parseFloat(str);
      if (tmp && !isNaN(tmp))
            return tmp;
      else
            return 0;
   },

   //
   // Проверка строки на число
   //
   isDiggit: function(str)
   {
      if(str)
      {
        str = str.toString().replace(',','.');
        var tmp = parseFloat(str);
        if (tmp && !isNaN(tmp))
              return true;
      }
        return false;
   },

   //
   // Преобразрвание числа к строке
   //
   floatToStr: function(val)
   {
      return val.toString().replace('.',',');
   },

   //
   // Разбиение тысячных в  строке
   //
   addCommas: function(nStr, separator)
   {
       var result = "";
       nStr += '';
       var x = nStr.split('.');
       var x1 = x[0];
       var x2 = x.length > 1 ? '.' + x[1] : '';
       //var x2 = x[1];
       var rgx = /(\d+)(\d{3})/;
       while (rgx.test(x1)) {
          x1 = x1.replace(rgx, '$1' + separator + '$2');
       }
       var tmpX2 = Routine.strToFloat(x2);
       if(tmpX2>0)
          result = x1 + tmpX2.toString().substr(1).replace('.', ',');
        else
          result = x1;
       return result;
    },

   //
   // Функция отображения прелоадера на форме
   //
    showLoader:function(){
                $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
    },

   //
   // Функция сокрытия прелоадера на форме
   //
    hideLoader:function(){
                $.unblockUI();
    },

    //
    // Функция склонения чисел
    //
    declOfNum:function(number, titles)
    {
      cases = [2, 0, 1, 1, 1, 2];
      return titles[ (number%100>4 && number%100<20)? 2 : cases[(number%10<5)?number%10:5] ];
    },

    //
    // Функция склонения дней
    //
    declOfDays:function(value)
    {
      return Routine.declOfNum(value, ['день', 'дня', 'дней']);
    },

    //
    // склоняет слово в зависимости от числа
    //
    Declension:function(num,expressions){
      if(expressions.length<3)
        expressions[2] = expressions[1];
          var count = num % 100;
          var result = "";
          if (count >= 5 && count <= 20) {
              result = expressions[2];
          } else {
              count = count % 10;
              if (count == 1) {
                  result = expressions[0];
              } else if (count >= 2 && count <= 4) {
                  result = expressions[1];
              } else {
                  result = expressions[2];
              }
          }
          return result;
    },
    ///
    ///
    ///
    rNToBr: function(str)
    {
        try
        {
          str = str.replace(/\n/g, "<br />");
          str = str.replace(/\r\n/g, "<br />");
        }
        catch(e){}
        return str;
    },

    brToRn: function(str)
    {
        try
        {
          str = str.replace(/<br *\/?>/gi, "\n");
        }
        catch(e){}
        return str;
    }
};
