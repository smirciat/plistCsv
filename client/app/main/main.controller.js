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
    let date = new Date();
    this.startDate=new Date(date.getFullYear(), date.getMonth(), 1);//now done through 1/9/2024
    this.http=$http;
    this.moment=moment;
    this.empNum="933";
    this.timeout=$timeout;
    this.interval=$interval;
    this.scope=$scope;
    this.Json="";
    this.file=undefined;
    this.fileExists=false;
    this.loading=false;
    this.multiple=false;
    this.monthly=true;
    this.closeout=true;
    this.data="none";
    this.complete=false;
    this.fullyComplete=false;
    this.twilight=true;
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
      //this.buildTwilightArray();
    });
    this.myInterval=this.interval(()=>{
      let fileWatch;
      let d=document.getElementById('file');
      if (d) fileWatch=d.files;
      if (fileWatch&&fileWatch.length>0) {
        this.fileExists=true;
        this.interval.cancel(this.myInterval);
      }
    },1000);
  }
  
  twilightChanged(){
    
    //if (this.twilight&&!this.twilightArray) this.buildTwilightArray();
  }
  
  buildTwilightArray(){
    this.twilightArray=[];
    let month=this.startDate.getMonth()+1;
    let year=this.startDate.getFullYear();
    this.daysInMonth=new Date(year,month,0).getDate();
    for (let d=1;d<=this.daysInMonth;d++){
    //for (let d=13;d<=15;d++){
      this.timeout(()=>{
        let dailyTwilightArray=[];
        let date = year + '-' + month + '-' + d;
        this.airports.forEach((airport,i)=>{
          this.timeout(()=>{
            let airportTwilights={};
            this.http.get('https://api.sunrise-sunset.org/json?lat=' + airport.latitude + '&lng=' + airport.longitude + '&date=' + date + '&formatted=0').then(res=>{
              if (res.data.results.civil_twilight_begin==='1970-01-01T00:00:01+00:00') return;
              else {
                airportTwilights.twilightStart = this.moment(res.data.results.civil_twilight_begin);
                airportTwilights.twilightEnd = this.moment(res.data.results.civil_twilight_end);
                airportTwilights.threeLetter=airport.threeLetter;
                airportTwilights.dateString=date;
                dailyTwilightArray.push(airportTwilights);
                console.log(airportTwilights);
              }
              if ((i>=this.airports.length-1)&&(d>=this.daysInMonth)) {
                this.twilightComplete=true;
                console.log(this.twilightArray);
              }
            });
          },i*200);
        });
        this.twilightArray.push(dailyTwilightArray);
      },(d-13)*10000);
    }
  }
  
  isNight(airport,moment){
    //let index=this.airports.map(e => e.threeLetter).indexOf(airport);
    //if (index<0) return false;
    let year = moment.year();
    let month = moment.month()+1;
    let day = moment.date();
    let date = year + '-' + month + '-' + day;
    let hour=moment.hour();
    let minute=moment.minute();
    let dailyArray=this.twilightArray[day-1];
    let index=dailyArray.map(e => e.threeLetter).indexOf(airport);
    if (index<0) return false;
    //let latitude=this.airports[index].latitude;
    //let longitude=this.airports[index].longitude;
    //return this.http.get('https://api.sunrise-sunset.org/json?lat=' + latitude + '&lng=' + longitude + '&date=' + date + '&formatted=0').then(res=>{
     // if (res.data.results.civil_twilight_begin==='1970-01-01T00:00:01+00:00') return false;
    let twilightStart = dailyArray[index].twilightStart;
    let twilightEnd = dailyArray[index].twilightEnd;
    //let departTime = this.moment(twilightStart).startOf('day').hour(hour).minute(minute);
    if (moment.isBetween(twilightStart,twilightEnd)) return false;
    else return true;
    //});
  }
  
  testNight(){
    console.log(this.isNight('OME',this.moment('2/14/2024 13:15:00')));
  }
  
  convertMoment(string){
    let stringArr=string.split("T");
    if (stringArr.length===2) {
      let date=new Date(stringArr[0]+' '+stringArr[1]);
      return this.moment(date);
      //return this.moment(string,'YYYY-MM-DDTHH:mm:ss.SSS[Z]');
    }
    return this.moment(string);
  }
    
  generateMonthly(){
    //data is in this.Json, parse the data and put it in the pdf file, then save it
    if (!this.Json||!Array.isArray(this.Json)||this.Json.length===0) return;
    this.fields={"Pilot Name":['Andy Smircich'],
                "Dropdown2":[this.moment(this.startDate).format('MMMM')],
                "Dropdown3":[this.moment(this.startDate).format('YYYY')]
    };
    //let dailyHours=[],dayTO=[],dayLND=[],nightTO=[],nightLND=[];
    let daysOff=0;
    let monthMinutes=0;
    let month=this.startDate.getMonth();
    let intMonth=month+1;
    let year=this.startDate.getFullYear();
    this.startDate=new Date(year,month,1);
    this.buildFlightInfo();
    let flights=this.flights.filter(flight=>{
      return month===flight.date.getMonth()&&year===flight.date.getFullYear();
    });
    this.daysInMonth=new Date(year,intMonth,0).getDate();
    for (let d=1;d<=this.daysInMonth;d++){
      if (d>=this.daysInMonth) this.twilightComplete=true;
      let todaysFlights=flights.filter(flight=>{
        return this.moment(flight.dateString).isSame(this.moment({year:year,month:month,day:d}),'day');
      });
      if (todaysFlights.length>0) {
        //dailyHours[d]=dayTO[d]=dayLND[d]=nightTO[d]=nightLND[d]=0;
      }
      let dayBoolean=false;
      let dayMinutes=0;
      let dayHours=0;
      let dayTO=0,dayLND=0,nightTO=0,nightLND=0;
      todaysFlights.forEach((flight,flightIndex)=>{
        dayBoolean=true;
        let flightMinutes=0;
        //dayTO+=flight.onOffArray.length;
        //lnd+=flight.onOffArray.length;
        flight.onOffArray.forEach((onOff,onOffIndex)=>{
          let end=this.convertMoment(onOff.on);
          //console.log(end)
          let start=this.convertMoment(onOff.off);
          let duration=this.moment.duration(end.diff(start)).asMinutes();
          flightMinutes+=duration;
          if (this.twilight){
            let index=this.airports.map(e => e.threeLetter).indexOf(flight.routeArray[onOffIndex]);
            if (index<0) {
              dayTO++;
              dayLND++;
              //if (d>=this.daysInMonth) this.twilightComplete=true;
            }
            else {
              let times = SunCalc.getTimes(new Date(start), this.airports[index].latitude, this.airports[index].longitude);
              let twilightStart = this.moment(times.dawn);
              let twilightEnd = this.moment(times.dusk);
              if (start.isBetween(twilightStart,twilightEnd)) dayTO++;
              else nightTO++;
              times = SunCalc.getTimes(new Date(start), this.airports[index+1].latitude, this.airports[index+1].longitude);
              twilightStart = this.moment(times.dawn);
              twilightEnd = this.moment(times.dusk);
              if (end.isBetween(twilightStart,twilightEnd)) dayLND++;
              else nightLND++;
              //if (d>=this.daysInMonth) this.twilightComplete=true;
            }
          }
          else {
            dayTO++;
            dayLND++;
            //if (d>=this.daysInMonth) this.twilightComplete=true;
          }
          //flight.routeArray[index] will show airports corresponding to these times, length is one greater than onOffArray due to beginning and ending airport
        });
        dayMinutes+=flightMinutes;
      });
      monthMinutes+=dayMinutes;
      dayHours=Math.floor(dayMinutes/60);
      let partialDayMinutes=dayMinutes%60;
      let minutesString=partialDayMinutes.toString();
      if (partialDayMinutes<10) minutesString='0'+minutesString;
      if (dayBoolean) {
        let tab=12*(d-1);//Form input names are incremented by 12 each row. Flight times start at 'T3' and day to at 'T4'
        this.fields['T'+tab]=['07:00'];
        tab++;
        this.fields['T'+tab]=['19:00'];
        tab++;
        this.fields['T'+tab]=['14:00'];
        tab++;
        this.fields['T'+tab]=[dayHours+':'+minutesString];
        tab++;
        this.fields['T'+tab]=[dayTO.toString()];
        tab++;
        this.fields['T'+tab]=[dayLND.toString()];
        tab++;
        this.fields['T'+tab]=[nightTO.toString()];
        tab++;
        this.fields['T'+tab]=[nightLND.toString()];
      }
      else {
        if (this.closeout){
          daysOff++;
          this.dayOff(d);
        }
        else {
          let tempMonth=month+1;
          let flightDateString=tempMonth+'/'+d+'/'+year;
          if (this.moment(flightDateString).isBefore(this.moment())){
            daysOff++;
            this.dayOff(d);
          }
        }
      }
      let monthHours=Math.floor(monthMinutes/60);
      let partialMonthMinutes=monthMinutes%60;
      let monthMinutesString=partialMonthMinutes.toString();
      if (partialMonthMinutes<10) monthMinutesString='0'+monthMinutesString;
      this.fields.T372=[monthHours+':'+monthMinutesString];
      this.fields.T373=[daysOff.toString()];
    }
    if (this.daysInMonth<31) this.fields.T360=["N/A"];
    if (this.daysInMonth<30) this.fields.T348=["N/A"];
    if (this.daysInMonth<29) this.fields.T336=["N/A"];
    //if (!this.twilight) this.twilightComplete=true;
  }
  
  makePDF(){
    this.http({ url: "/pdf?filename=" + "F12" + ".pdf", 
        method: "GET", 
        headers: { 'Accept': 'application/pdf' }, //'text/plain'
        responseType: 'arraybuffer' })
      .then(response=> {
        let filled_pdf; // Uint8Array
		    filled_pdf = pdfform().transform(response.data, this.fields);
		    //console.log(pdfform().list_this.fields(response.data));
		    let blob = new Blob([filled_pdf], {type: 'application/pdf'});
		    let filename="F12" + "_" + 'Smircich' + '_' + this.moment(this.startDate).format('YYYY')  + '_' + this.moment(this.startDate).format('MMMM') + '.pdf';
	      saveAs(blob, filename);
	      //unspin buttons
	      //this.loading=false;
	      //
      }).catch(err=>{
        console.log(err);
        this.loading=false;
    });
  }
  
  convertToCSV(){
      if (!this.Json||!Array.isArray(this.Json)||this.Json.length===0) return;
      this.buildFlightInfo();
      let blob = new Blob([ this.csv ], { type : 'text/plain' });
      this.url = (window.URL || window.webkitURL).createObjectURL( blob );//window.location???
      this.complete=true;
      this.fullyComplete=false;
  }
    
  buildFlightInfo(){
      this.flights=[];
      let csvHeader="TODay,LdgDay,TimeOff,TimeOn,FlightDate,Aircraft,AircraftCode,origin,destination,intermediate,DepCode,ArrCode,minTotal,minPIC,minXC,minIFR,P1Code,PF,CurrRent,CurrPilot,CurrPerDiem,BaseOffSet,DepOffset,ArrOffset,FlightNumber,Remarks,TypeOfInstr,NextPage,Pairing,UserN2,Report";//"date,aircraft,startLocation,endLocation,intermediateLocations,totalFlightTime,landings";
      let csv=csvHeader+"\n";
      let flightInfo,month,index,ftArray,dash,monthString,dayString,digits;
      //this.Json=this.jsonPlist;//this.xml2json(srcDOM);
      digits=3;
      for (let x=0;x<this.Json.length;x++) {
        if (!this.Json[x]||this.Json[x].acftNumber===undefined||
                this.Json[x].acftNumber==="") continue;
        if (this.empNum.length>3) digits=4;
        else digits=this.empNum.length;
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
        if (this.empNum!==""&&this.Json[x].pfrNumber&&this.empNum.substring(0,digits)!==this.Json[x].pfrNumber.substring(0,digits)) {
          flightInfo.flightTimeMinutes=0;
          flightInfo.flightTimeDecimal=0;
          flightInfo.landings=0;
          flightInfo.onOffArray=[]; 
          flightInfo.routeArray=[];
          this.flights.push(flightInfo);
          continue;
        }
        else {
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
            for (let i=1;i<flightInfo.routeArray.length-1;i++){
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
            let legInfo=JSON.parse(JSON.stringify(flightInfo));
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
      }
      this.csv=csv;
  }
  
  addCsvLine(flightInfo){
    //"TODay,LdgDay,TimeOff,TimeOn,FlightDate,Aircraft,AircraftCode,origin,destination,intermediate,DepCode,ArrCode,minTotal,minPIC,minXC,minIFR,P1Code,PF,CurrRent,CurrPilot,CurrPerDiem,BaseOffSet,DepOffset,ArrOffset,FlightNumber,Remarks,TypeOfInstr,NextPage,Pairing,UserN2,Report";//"date,aircraft,startLocation,endLocation,intermediateLocations,totalFlightTime,landings";
    let csvLine="";
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
  
  dayOff(day){
    let tab=12*(day-1);
    this.fields['T'+tab]=['OFF'];
    tab++;
    this.fields['T'+tab]=['------------'];
    tab++;
    this.fields['T'+tab]=['------------'];
    tab++;
    this.fields['T'+tab]=['------------'];
  }
  
  scrubDate(date){
    let monthString,dayString;
    date=new Date(date);
    let month=date.getMonth()+1;
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
    let f = document.getElementById('file').files[0];
    let r = new FileReader();
      r.onloadend = e=>{
        this.http.post('/api/workouts/upload',{data:btoa(e.target.result)}).then(res=>{
          this.Json=JSON.parse(res.data)[0];
          if (this.monthly) this.generateMonthly();
          else this.convertToCSV();
          this.loading=false;
        }).catch(err=>{
          this.fullyComplete=false;
          this.loading=false;
          console.log(err);
          alert(err.data.response);
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
