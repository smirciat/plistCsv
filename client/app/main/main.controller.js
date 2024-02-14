'use strict';

(function(){

class MainController {
  constructor($http,$timeout,$interval,$scope,moment) {
    //plutil -convert xml1 *.plist
    //1.  bring over plutil formatted xml file after conversion, originally from ipad backup
    //2.  upload into pdfs folder in IDE
    //3.  update url target in line 38
    //4.  update this.startDate for beginning flight records to import line 14
    //4.  open /xml route, wait for console.log, then click download
    //5.  result.csv can be imported into database file for mccPilotLog (watch for nulls)
    var date = new Date();
    this.startDate=new Date(date.getFullYear(), date.getMonth(), 1);//now done through 1/9/2024
    this.http=$http;
    this.moment=moment;
    this.flights=[];
    this.empNum="";
    this.timeout=$timeout;
    this.interval=$interval;
    this.scope=$scope;
    var d;
    this.Json="";
    this.file=undefined;
    this.fileExists=false;
    this.loading=false;
    this.multiple=false;
    this.monthly=false;
    this.data="none";
    this.complete=false;
    this.fullyComplete=false;
    this.planeMap=[{code:17,aircraft:"N241BA"},
                    {code:18,aircraft:"N952BA"},
                    {code:19,aircraft:"N573BA"},
                    {code:20,aircraft:"N404BA"},
                    {code:21,aircraft:"N215BA"},
                    {code:22,aircraft:"N996BA"},
                    {code:23,aircraft:"N867BA"},
                    {code:24,aircraft:"N848BA"},
                    {code:25,aircraft:"N679BA"},
                    {code:26,aircraft:"N610BA"},
                    {code:124,aircraft:"N208NP"},
                    {code:125,aircraft:"N772BA"},
                    {code:126,aircraft:"N321BA"},
                    {code:127,aircraft:"N190BA"},
                    {code:128,aircraft:"N759BA"},
                    {code:129,aircraft:"N994BA"}
    ];
  }
  
  $onInit() {
    this.http.get('/api/airports').then(res=>{
      this.airports=res.data;
    });
    this.myInterval=this.interval(()=>{
      var fileWatch;
      var d=document.getElementById('file');
      if (d) fileWatch=d.files;
      if (fileWatch&&fileWatch.length>0) {
        this.fileExists=true;
        this.interval.cancel(this.myInterval);
      }
    },1000);
  }
  
  buildTwilightArray(date){
    
  }
  
  isNight(airport,moment){
    let index=this.airports.map(e => e.threeLetter).indexOf(airport);
    if (index<0) return false;
    let year = moment.year();
    let month = moment.month()+1;
    let day = moment.date();
    let date = year + '-' + month + '-' + day;
    let hour=moment.hour();
    let minute=moment.minute();
    let latitude=this.airports[index].latitude;
    let longitude=this.airports[index].longitude;
    return this.http.get('https://api.sunrise-sunset.org/json?lat=' + latitude + '&lng=' + longitude + '&date=' + date + '&formatted=0').then(res=>{
      if (res.data.results.civil_twilight_begin==='1970-01-01T00:00:01+00:00') return false;
      var twilightStart = this.moment(res.data.results.civil_twilight_begin);
      var twilightEnd = this.moment(res.data.results.civil_twilight_end);
      var departTime = this.moment(twilightStart).startOf('day').hour(hour).minute(minute);
      if (departTime.isBetween(twilightStart,twilightEnd)) return false;
      else return true;
    });
  }
    
  generateMonthly(){
    //data is in this.Json, parse the data and put it in the pdf file, then save it
    if (!this.Json||!Array.isArray(this.Json)||this.Json.length===0) return;
    var fields={"Pilot Name":['Andy Smircich'],
                "Dropdown2":[this.moment(this.startDate).format('MMMM')],
                "Dropdown3":[this.moment(this.startDate).format('YYYY')]
    };
    var dailyHours=[],dayTO=[],dayLND=[],nightTO=[],nightLND=[];
    var daysOff=0;
    var monthMinutes=0;
    var month=this.startDate.getMonth();
    var year=this.startDate.getFullYear();
    this.startDate=new Date(year,month,1);
    this.buildFlightInfo();
    var flights=this.flights.filter(flight=>{
      return month===flight.date.getMonth()&&year===flight.date.getFullYear();
    });
    var daysInMonth=new Date(year,month+1,0).getDate();
    for (var d=1;d<=daysInMonth;d++){
      let todaysDateString=new Date(year,month,d).toLocaleDateString();
      let todaysFlights=flights.filter(flight=>{
        return this.moment(flight.dateString).isSame(todaysDateString,'day');
      });
      if (todaysFlights.length>0) {
        dailyHours[d]=dayTO[d]=dayLND[d]=nightTO[d]=nightLND[d]=0;
      }
      let dayMinutes=0;
      let dayHours=0;
      let to=0,lnd=0;
      todaysFlights.forEach(flight=>{
        let flightMinutes=0;
        to+=flight.onOffArray.length;
        lnd+=flight.onOffArray.length;
        flight.onOffArray.forEach((onOff,index)=>{
          let end=this.moment(onOff.on);
          let start=this.moment(onOff.off);
          let duration=this.moment.duration(end.diff(start)).asMinutes();
          flightMinutes+=duration;
          //flight.routeArray[index] will show airports corresponding to these times, length is one greater than onOffArray due to beginning and ending airport
        });
        dayMinutes+=flightMinutes;
      });
      monthMinutes+=dayMinutes;
      dayHours=Math.floor(dayMinutes/60);
      let partialDayMinutes=dayMinutes%60;
      let minutesString=partialDayMinutes.toString();
      if (partialDayMinutes<10) minutesString='0'+minutesString;
      if (dayHours!==0||dayMinutes!==0) {
        let tab=12*(d-1);//Form input names are incremented by 12 each row. Flight times start at 'T3' and day to at 'T4'
        fields['T'+tab]=['07:00'];
        tab++;
        fields['T'+tab]=['19:00'];
        tab++;
        fields['T'+tab]=['14:00'];
        tab++;
        fields['T'+tab]=[dayHours+':'+minutesString];
        tab++;
        fields['T'+tab]=[to.toString()];
        tab++;
        fields['T'+tab]=[lnd.toString()];
        tab++;
        fields['T'+tab]=['0'];
        tab++;
        fields['T'+tab]=['0'];
      }
      else {
        daysOff++;
        let tab=12*(d-1);
        fields['T'+tab]=['OFF'];
        tab++;
        fields['T'+tab]=['------------'];
        tab++;
        fields['T'+tab]=['------------'];
        tab++;
        fields['T'+tab]=['------------'];
      }
      var monthHours=Math.floor(monthMinutes/60);
      let partialMonthMinutes=monthMinutes%60;
      let monthMinutesString=partialMonthMinutes.toString();
      if (partialMonthMinutes<10) monthMinutesString='0'+monthMinutesString;
      fields.T372=[monthHours+':'+monthMinutesString];
      fields.T373=[daysOff.toString()];
    }
    this.http({ url: "/pdf?filename=" + "F12" + ".pdf", 
        method: "GET", 
        headers: { 'Accept': 'application/pdf' }, //'text/plain'
        responseType: 'arraybuffer' })
      .then(response=> {
        var filled_pdf; // Uint8Array
		    filled_pdf = pdfform().transform(response.data, fields);
		    //console.log(pdfform().list_fields(response.data));
		    var blob = new Blob([filled_pdf], {type: 'application/pdf'});
		    var filename="F12" + "_" + 'Smircich' + '_' + year + '_' + this.moment(this.startDate).format('MMMM') + '.pdf';
	      saveAs(blob, filename);
	      //unspin buttons
	      //this.loading=false;
	      //
      }).catch(err=>{
        console.log(err);
        this.loading=false;
    });
    if (daysInMonth<31) fields.T360=["N/A"];
    if (daysInMonth<30) fields.T348=["N/A"];
    if (daysInMonth<29) fields.T336=["N/A"];
  }
  
  convertToCSV(){
      if (!this.Json||!Array.isArray(this.Json)||this.Json.length===0) return;
      this.buildFlightInfo();
      var blob = new Blob([ this.csv ], { type : 'text/plain' });
      this.url = (window.URL || window.webkitURL).createObjectURL( blob );//window.location???
      this.complete=true;
      this.fullyComplete=false;
  }
    
  buildFlightInfo(){
      this.flights=[];
      var csvHeader="TODay,LdgDay,TimeOff,TimeOn,FlightDate,Aircraft,AircraftCode,origin,destination,intermediate,DepCode,ArrCode,minTotal,minPIC,minXC,minIFR,P1Code,PF,CurrRent,CurrPilot,CurrPerDiem,BaseOffSet,DepOffset,ArrOffset,FlightNumber,Remarks,TypeOfInstr,NextPage,Pairing,UserN2,Report";//"date,aircraft,startLocation,endLocation,intermediateLocations,totalFlightTime,landings";
      var csv=csvHeader+"\n";
      var flightInfo,month,index,ftArray,dash,monthString,dayString,digits;
      //this.Json=this.jsonPlist;//this.xml2json(srcDOM);
      digits=3;
      for (var x=0;x<this.Json.length;x++) {
        if (!this.Json[x]||this.Json[x].acftNumber===undefined||
                this.Json[x].acftNumber==="") continue;
        if (this.empNum.length>3) digits=4;
        else digits=this.empNum.length;
        if (this.empNum!==""&&this.Json[x].pfrNumber&&this.empNum.substring(0,digits)!==this.Json[x].pfrNumber.substring(0,digits)) continue;
        flightInfo={};
        flightInfo.aircraft=this.Json[x].acftNumber;
        flightInfo.date=new Date(this.Json[x].date);
        if (flightInfo.date<this.startDate) continue;
        month=flightInfo.date.getMonth()+1;
        if (month<10) monthString="0" + month;
        else monthString=month;
        if (flightInfo.date.getDate()<10) dayString='0'+flightInfo.date.getDate();
        else dayString=flightInfo.date.getDate();
        flightInfo.dateString=flightInfo.date.getFullYear()+'-'+monthString+'-'+dayString;
        index=this.planeMap.map(e => e.aircraft).indexOf(flightInfo.aircraft);
        if (index&&index>-1) flightInfo.aircraftCode=this.planeMap[index].code;
        if (!flightInfo.aircraftCode) flightInfo.aircraftCode=17;
        flightInfo.routeArray=this.Json[x].route;
        flightInfo.landings=0;
        flightInfo.intermediates="-";
        if (flightInfo.routeArray&&flightInfo.routeArray!=='undefined'&&flightInfo.routeArray.length>1) {
          flightInfo.landings=flightInfo.routeArray.length-1;
          flightInfo.departure=flightInfo.routeArray[0];
          flightInfo.departureCode='-21188';
          if (flightInfo.departure==="OTZ") flightInfo.departureCode="-21191";
          flightInfo.destination=flightInfo.routeArray[flightInfo.routeArray.length-1];
          flightInfo.destinationCode='-21188';
          if (flightInfo.destination==="OTZ") flightInfo.destinationCode="-21191";
          for (var i=1;i<flightInfo.routeArray.length-1;i++){
            if (i===1) dash="";
            else dash ="-";
            flightInfo.intermediates=flightInfo.intermediates + dash + flightInfo.routeArray[i];
          }
        }
        flightInfo.flightTimeMinutes=this.Json[x].flightTime;
        flightInfo.flightTimeDecimal=this.Json[x].flightTime/60;
        flightInfo.onOffArray=this.Json[x].legTimesArray;
        flightInfo.timeOff=new Date(flightInfo.onOffArray[0].off).toLocaleTimeString();
        flightInfo.timeOn=new Date(flightInfo.onOffArray[flightInfo.onOffArray.length-1].on).toLocaleTimeString();
        flightInfo.flightNumber=this.Json[x].flightNumber;
        if (!this.multiple) csv+=this.addCsvLine(flightInfo);
        else {
          var legInfo=JSON.parse(JSON.stringify(flightInfo));
          legInfo.onOffArray.forEach((element,index)=>{
            legInfo.intermediates="-";
            legInfo.timeOff=new Date(element.off).toLocaleTimeString();
            legInfo.timeOn=new Date(element.on).toLocaleTimeString();
            legInfo.flightTimeMinutes=(new Date(element.on)-new Date(element.off))/(1000*60);
            legInfo.flightTimeDecimal=legInfo.flightTimeMinute/60;
            legInfo.departure=legInfo.routeArray[index];
            legInfo.destination=legInfo.routeArray[index+1];
            legInfo.landings=1;
            csv+=this.addCsvLine(legInfo);
          });
        }
        this.flights.push(flightInfo);
      }
      this.csv=csv;
  }
  
  addCsvLine(flightInfo){
    //"TODay,LdgDay,TimeOff,TimeOn,FlightDate,Aircraft,AircraftCode,origin,destination,intermediate,DepCode,ArrCode,minTotal,minPIC,minXC,minIFR,P1Code,PF,CurrRent,CurrPilot,CurrPerDiem,BaseOffSet,DepOffset,ArrOffset,FlightNumber,Remarks,TypeOfInstr,NextPage,Pairing,UserN2,Report";//"date,aircraft,startLocation,endLocation,intermediateLocations,totalFlightTime,landings";
    var csvLine="";
    csvLine+=flightInfo.landings+','+flightInfo.landings+',';
    csvLine+=flightInfo.timeOff+','+flightInfo.timeOn+',';
    csvLine+=flightInfo.dateString+',';
    csvLine+=flightInfo.aircraft+','+flightInfo.aircraftCode+',';
    csvLine+=flightInfo.departure+','+flightInfo.destination+','+flightInfo.intermediates+',';
    csvLine+=flightInfo.departureCode + ',' + flightInfo.destinationCode + ',';
    csvLine+=flightInfo.flightTimeMinutes+','+flightInfo.flightTimeMinutes+','+flightInfo.flightTimeMinutes+','+flightInfo.flightTimeMinutes+',';
    csvLine+='1,1,9,9,9,-540,-540,-540,';
    csvLine+=flightInfo.flightNumber+','+flightInfo.intermediates+',';
    csvLine+=" ,0, , , ";
    csvLine+="\n";
    return csvLine;
  }
  
  scrubDate(date){
    var monthString,dayString;
    date=new Date(date);
    var month=date.getMonth()+1;
    if (month<10) monthString="0" + month;
    else monthString=month;
    if (date.getDate()<10) dayString='0'+date.getDate();
    else dayString=date.getDate();
    return date.getFullYear()+'-'+monthString+'-'+dayString;
  }
  
  download(){
    this.timeout(()=>{
      this.fullyComplete=true;
      this.complete=false;
      
    },3000);
  }
  
  isItLoading(){
      return this.loading;
    }
  
  inputChange(){
    console.log('input change');
    this.fileExists=true;
  }
  
  isThereAFile(){
    return this.fileExists;//this.file!==undefined;
  }
  
  isItComplete(){
    return this.complete;
  }
  
  isItFullyComplete(){
    return this.fullyComplete;
  }
  
  add(){
    this.loading=true;
    this.fullyComplete=false;
    var f = document.getElementById('file').files[0];
    var r = new FileReader();
      r.onloadend = e=>{
        this.http.post('/api/workouts/upload',{data:btoa(e.target.result)}).then(res=>{
          this.Json=JSON.parse(res.data)[0];
          if (this.monthly) this.generateMonthly();
          else this.convertToCSV();
          this.loading=false;
        }).catch(err=>{
          this.fullyComplete=false;
          this.loading=false;
          alert(err.data.response);
          console.log(err);
        });
      };
      r.readAsBinaryString(f);
  }
}

  angular.module('plistCsvApp')
    .component('main', {
      templateUrl: 'app/main/main.html',
      controller: MainController,
      controllerAs: 'main'
    });
})();
