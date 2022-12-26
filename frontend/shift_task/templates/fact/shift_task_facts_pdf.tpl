<html>
  <head>
    <meta charset="utf-8">
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
    <style type="text/css">
         @page {
            size: 60mm 40mm portrait;
            @frame content_frame {
                top:5mm;
                left:2mm;
                width: 56mm;
                height: 33mm;
            }
        }
         @font-face { font-family: Arial; src: url(./static/fonts/arial.ttf); }
         @font-face { font-family: Arialbold; src: url(./static/fonts/arialbd.ttf); }

         .arial{font-family: Arial;}
         .arial-bold{font-family: Arialbold;}
         .item{
          text-align:center;
          margin:0;
          padding:0;
         }
         .number{
          font-size: 14px;
          line-height: 18px;
         }
         .name{
          font-size: 12px;
         }
         .unique_props{
          font-size: 8px;
         }
         .page-break{
            display: block;
            page-break-after: always;
        }
    </style>
  </head>
  <body>
     %for row in data['items']:
        <div class = "number arial-bold item" >{{row['number']}}</div>
        <div class = "name arial item">{{row['name']}}</div>
        <div class = "unique_props arial item page-break">{{row['unique_props']}}&nbsp;</div>
    %end
  </body>
</html>
