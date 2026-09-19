'use strict';

(function(){

class MainController {
  constructor($http,$timeout,$interval,$scope,moment) {
    let date = new Date();
    this.startDate=new Date(date.getFullYear(), date.getMonth(), 1);//now done through 1/9/2024
    this.endDate=new Date(date.getFullYear(), date.getMonth(), date.getDate());
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
                    {code:129,aircraft:"N994BA"},
                    {code:130,aircraft:"N171CJ"},
                    {code:131,aircraft:"N148SK"},
                    {code:132,aircraft:"N15GA"},
                    {code:133,aircraft:"N954LE"}
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
    if (!string||string==="") return undefined;
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
    //console.log(this.Json);
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
      let dayTOMulti=0,dayLNDMulti=0,nightTOMulti=0,nightLNDMulti=0;
      let dutyTimeOn,dutyTimeOff;
      todaysFlights.forEach((flight,flightIndex)=>{
        dayBoolean=true;
        if (flight.dutyTimeOn&&flight.dutyTimeOn!=="") dutyTimeOn=flight.dutyTimeOn;
        if (flight.dutyTimeOff&&flight.dutyTimeOff!=="") dutyTimeOff=flight.dutyTimeOff;
        let flightMinutes=0;
        //dayTO+=flight.onOffArray.length;
        //lnd+=flight.onOffArray.length;
        if (flight.onOffArray&&flight.onOffArray.length>0&&flight.onOffArray[0].on&&flight.onOffArray[0].off) {
          flight.onOffArray.forEach((onOff,onOffIndex)=>{
            let localFlight=false;
            if (!onOff.on||!onOff.off) return;
            let end=this.convertMoment(onOff.on);
            let start=this.convertMoment(onOff.off);
            let duration=this.moment.duration(end.diff(start)).asMinutes();
            flightMinutes+=duration;
            if (this.twilight){
              let index=this.airports.map(e => e.threeLetter).indexOf(flight.routeArray[onOffIndex]);
              let index1=this.airports.map(e => e.threeLetter).indexOf(flight.routeArray[onOffIndex+1]);
              if (this.airports[index]&&this.airports[index1]&&this.airports[index].fourLetter===this.airports[index1].fourLetter) localFlight=true;
              let times,twilightStart,twilightEnd,sunrise,sunset;
              if (this.airports[index]){
                times = SunCalc.getTimes(new Date(end), this.airports[index].latitude, this.airports[index].longitude);
                twilightStart = this.moment(times.dawn);
                twilightEnd = this.moment(times.dusk);
                sunrise=this.moment(times.sunrise).subtract(1,'hours');
                sunset=this.moment(times.sunset).add(1,'hours');
                if (start.isBetween(sunrise,sunset)||!((times.sunrise instanceof Date && !isNaN(times.sunrise)&&times.sunset instanceof Date && !isNaN(times.sunset)))) {
                  if (flight.aircraftCode<130||flight.aircraftCode>133) dayTO++;
                  else {
                    if (onOffIndex%2===0||localFlight) dayTOMulti++;
                  }
                }
                else {
                  if (flight.aircraftCode<130||flight.aircraftCode>133) nightTO++;
                  else if (onOffIndex%2===0||localFlight) nightTOMulti++;
                }
              }
              else {
                if (flight.aircraftCode<130||flight.aircraftCode>133) dayTO++;
                else if (onOffIndex%2===0||localFlight) dayTOMulti++;
              }
              if (this.airports[index1]){
                times = SunCalc.getTimes(new Date(end), this.airports[index1].latitude, this.airports[index1].longitude);
                twilightStart = this.moment(times.dawn);
                twilightEnd = this.moment(times.dusk);
                sunrise=this.moment(times.sunrise).subtract(1,'hours');
                sunset=this.moment(times.sunset).add(1,'hours');
                if (end.isBetween(sunrise,sunset)||!((times.sunrise instanceof Date && !isNaN(times.sunrise)&&times.sunset instanceof Date && !isNaN(times.sunset)))) {
                  if (flight.aircraftCode<130||flight.aircraftCode>133) dayLND++;
                  else if (onOffIndex%2===0||localFlight) dayLNDMulti++;
                }
                else {
                  if (flight.aircraftCode<130||flight.aircraftCode>133) nightLND++;
                  else if (onOffIndex%2===0||localFlight) nightLNDMulti++;
                }
              }
              else {
                if (flight.aircraftCode<130||flight.aircraftCode>133) dayLND++;
                else if (onOffIndex%2===0||localFlight) dayLNDMulti++;
              }
            }
            else {
              if (flight.aircraftCode<130||flight.aircraftCode>133) {
                dayTO++;
                dayLND++;
              }
              else {
                if (onOffIndex%2===0||localFlight) dayTOMulti++;
                if (onOffIndex%2===0||localFlight) dayLNDMulti++;
              }
            }
          });
        }
        dayMinutes+=flightMinutes;
      });
      monthMinutes+=dayMinutes;
      dayHours=Math.floor(dayMinutes/60);
      let partialDayMinutes=dayMinutes%60;
      let minutesString=partialDayMinutes.toString();
      if (partialDayMinutes<10) minutesString='0'+minutesString;
      if (dayBoolean) {
        let tab=12*(d-1);//Form input names are incremented by 12 each row. Flight times start at 'T3' and day to at 'T4'
        this.fields['T'+tab]=[dutyTimeOn||'07:01'];
        tab++;
        this.fields['T'+tab]=[dutyTimeOff||'21:01'];
        tab++;
        this.fields['T'+tab]=[this.calculateDuty(dutyTimeOn,dutyTimeOff)||'14:01'];
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
        //next 4 tabs are for multiengine, t375 an t376 are multiengine night currency
        tab++;
        this.fields['T'+tab]=[dayTOMulti.toString()];
        tab++;
        this.fields['T'+tab]=[dayLNDMulti.toString()];
        tab++;
        this.fields['T'+tab]=[nightTOMulti.toString()];
        tab++;
        this.fields['T'+tab]=[nightLNDMulti.toString()];
      }
      else {
        if (this.closeout){
          daysOff++;
          this.dayOff(d);
        }
        else {
          let tempMonth=month+1;
          let flightDateString=tempMonth+'/'+d+'/'+year;
          if (this.moment(flightDateString).isBefore(this.moment().subtract(1, 'days'))){
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
    if (this.daysInMonth<31) {
      this.fields.T360=["N/A"];
      this.fields.T361=['------------'];
      this.fields.T362=['------------'];
      this.fields.T363=['------------'];
      for (let x=0;x<8;x++) {
        let t=364+x;
        this.fields['T'+t]=['---'];
      }
    }
    if (this.daysInMonth<30) {
      this.fields.T348=["N/A"];
      this.fields.T349=['------------'];
      this.fields.T350=['------------'];
      this.fields.T351=['------------'];
      for (let x=0;x<8;x++) {
        let t=352+x;
        this.fields['T'+t]=['---'];
      }
    }
    if (this.daysInMonth<29) {
      this.fields.T336=["N/A"];
      this.fields.T337=['------------'];
      this.fields.T338=['------------'];
      this.fields.T339=['------------'];
      for (let x=0;x<8;x++) {
        let t=340+x;
        this.fields['T'+t]=['---'];
      }
    }
    this.flights.sort((a,b)=>{
      return new Date(b.date)-new Date(a.date);
    });
    let nightLandingCount=0;
    let nightLandingCountMulti=0;
    //multi night needs to be tracked as well
    for (let n=0;n<this.flights.length;n++){
      let localFlight=false;
      let flight=this.flights[n];
      if (flight.onOffArray&&flight.onOffArray.length>0&&flight.onOffArray[0].on&&flight.onOffArray[0].off) {
          flight.onOffArray.forEach((onOff,onOffIndex)=>{
            if (!onOff.on) return;
            let end=this.convertMoment(onOff.on);
              let index1=this.airports.map(e => e.threeLetter).indexOf(flight.routeArray[onOffIndex+1]);
              if (flight.routeArray[onOffIndex]===flight.routeArray[onOffIndex-1]) localFlight=true;
              let times,sunrise,sunset;
              if (this.airports[index1]){
                times = SunCalc.getTimes(new Date(end), this.airports[index1].latitude, this.airports[index1].longitude);
                sunrise=this.moment(times.sunrise).subtract(1,'hours');
                sunset=this.moment(times.sunset).add(1,'hours');
                if (!end.isBetween(sunrise,sunset)&&((new Date(times.sunrise) instanceof Date && !isNaN(new Date(times.sunrise))&&new Date(times.sunset) instanceof Date && !isNaN(new Date(times.sunset))))) {
                  
                  if (flight.aircraftCode<130||flight.aircraftCode>133) nightLandingCount++;
                  else {
                    if (onOffIndex%2===0||localFlight) nightLandingCountMulti++;
                  }
                }
              }
          });
      }
      if (nightLandingCount>=3&&!this.fields.T374) {
        this.fields.T374=[this.moment(flight.date).add(90,'days').format('MM/DD/YY')];
      }
      if (nightLandingCountMulti>=3&&!this.fields.T375) {
        this.fields.T375=[this.moment(flight.date).add(90,'days').format('MM/DD/YY')];
        this.fields.T376=this.fields.T375;
      }
      if (this.fields.T374&&this.fields.T375) n=this.flights.length;
    }
    if (!this.fields.T374) this.fields.T374=["N/A"];
    if (!this.fields.T375) this.fields.T375=["N/A"];
    if (!this.fields.T376) this.fields.T376=["N/A"];
  }
  
  calculateDuty(on,off){
    if (!on||!off||typeof on !== 'string'||typeof off !== 'string') return undefined;
    let onArr=on.split(':');
    let offArr=off.split(':');
    if (onArr.length<2||offArr.length<2) return undefined;
    if (isNaN(onArr[0])||isNaN(onArr[1])||isNaN(offArr[0])||isNaN(offArr[1])) return undefined;
    if (offArr[1]<onArr[1]){
      offArr[0]-=1;
      offArr[1]+=60;
    }
    let minutes=offArr[1]-onArr[1];
    let hours=offArr[0]-onArr[0];
    if (minutes<10) minutes='0'+minutes;
    return hours + ':' + minutes;
  }
  
  makePDF(){
    this.http({ url: "/pdf?filename=" + "F12New" + ".pdf", 
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
      //this.Json[x].flightBeganString & flightEndedString when flightNumber==="", in format of "21:00"
      this.flights=[];
      let csvHeader="TODay,LdgDay,TONight,LdgNight,TimeOff,TimeOn,FlightDate,Aircraft,AircraftCode,origin,destination,intermediate,DepCode,ArrCode,minTotal,minPIC,minXC,minIFR,P1Code,PF,CurrRent,CurrPilot,CurrPerDiem,BaseOffSet,DepOffset,ArrOffset,FlightNumber,Remarks,TypeOfInstr,NextPage,Pairing,UserN2,Report,minNight";//"date,aircraft,startLocation,endLocation,intermediateLocations,totalFlightTime,landings";
      let csv=csvHeader+"\n";
      let month,index,dash,monthString,dayString,digits,threeMonthsAgo;
      threeMonthsAgo=this.moment(this.startDate).subtract(90,'days');
      //this.Json=this.jsonPlist;//this.xml2json(srcDOM);
      digits=3;
      for (let x=0;x<this.Json.length;x++) {
        let flightInfo={date:new Date(this.Json[x].date)};
        if (this.Json[x].flightNumber==="") {
          if (this.Json[x].flightBeganString!=="") flightInfo.dutyTimeOn=this.Json[x].flightBeganString;
          if (this.Json[x].flightEndedString!=="") flightInfo.dutyTimeOff=this.Json[x].flightEndedString;
        }
        if (this.monthly) {
          if (this.moment(flightInfo.date).isBefore(threeMonthsAgo)) continue;
        }
        //else if (this.moment(flightInfo.date).isBefore(this.moment(this.startDate).add(1,'days'))) continue;
        else if (flightInfo.date<this.startDate) continue;
        else if (this.endDate && this.moment(flightInfo.date).isAfter(this.moment(this.endDate), 'day')) continue;
        month=flightInfo.date.getMonth()+1;
        if (month<10) monthString="0" + month;
        else monthString=month;
        if (flightInfo.date.getDate()<10) dayString='0'+flightInfo.date.getDate();
        else dayString=flightInfo.date.getDate();
        flightInfo.dateString=flightInfo.date.getFullYear()+'-'+monthString+'-'+dayString;
        if (!this.Json[x]||this.Json[x].acftNumber===undefined||this.Json[x].acftNumber==="") {
          flightInfo.flightTimeMinutes=0;
          flightInfo.flightTimeDecimal=0;
          flightInfo.landings=0;
          flightInfo.onOffArray=[]; 
          flightInfo.routeArray=[];
          this.flights.push(flightInfo);
          continue;
        }
        if (this.empNum.length>3) digits=4;
        else digits=this.empNum.length;
        flightInfo.aircraft=this.Json[x].acftNumber;
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
            if (flightInfo.aircraftCode>=130&&flightInfo.aircaftCode<=133) flightInfo.landings=Math.floor((flightInfo.routeArray.length-1)/2)+1;
            else flightInfo.landings=flightInfo.routeArray.length-1;
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
          flightInfo.night=0;
          flightInfo.dayTO=0;
          flightInfo.dayLND=0;
          flightInfo.nightTO=0;
          flightInfo.nightLND=0;
          flightInfo.dayTOMulti=0;
          flightInfo.dayLNDMulti=0;
          flightInfo.nightTOMulti=0;
          flightInfo.nightLNDMulti=0;
          let legInfo=JSON.parse(JSON.stringify(flightInfo));
          legInfo.onOffArray.forEach((element,index)=>{
            if (!element.off||!element.on) return;
            legInfo.intermediates="-";
            legInfo.timeOff=new Date(element.off).toLocaleTimeString();
            legInfo.timeOn=new Date(element.on).toLocaleTimeString();
            legInfo.flightTimeMinutes=(new Date(element.on)-new Date(element.off))/(1000*60);
            legInfo.flightTimeDecimal=legInfo.flightTimeMinute/60;
            legInfo.departure=legInfo.routeArray[index];
            legInfo.destination=legInfo.routeArray[index+1];
            //legInfo.landings=1;
            legInfo.night=0;
            legInfo.dayTO=0;
            legInfo.dayLND=0;
            legInfo.nightTO=0;
            legInfo.nightLND=0;
            legInfo.dayTOMulti=0;
            legInfo.dayLNDMulti=0;
            legInfo.nightTOMulti=0;
            legInfo.nightLNDMulti=0;
            let momentOff=this.convertMoment(element.off);
            let momentOn=this.convertMoment(element.on);
            let airportIndex=this.airports.map(e => e.threeLetter).indexOf(legInfo.departure);
            if (this.airports[airportIndex]) {
              let times=SunCalc.getTimes(new Date(element.off),this.airports[airportIndex].latitude, this.airports[airportIndex].longitude);
              let dawn=this.moment(times.dawn);
              let dusk=this.moment(times.dusk);
              let sunrise=this.moment(times.sunrise).subtract(1,'hours');
              let sunset=this.moment(times.sunset).add(1,'hours');
              let dawn1,dusk1,times1,sunrise1,sunset1;
              let offNight=false;
              let onNight=false;
              let offNightLnd=false;
              let onNightLnd=false;
              if (isNaN(new Date(momentOff))||isNaN(new Date(dawn))||isNaN(new Date(dusk))) offNight=false;
              else offNight=!momentOff.isBetween(dawn,dusk);
              if (isNaN(new Date(momentOff))||isNaN(new Date(sunrise))||isNaN(new Date(sunset))) offNightLnd=false;
              else offNightLnd=!momentOff.isBetween(sunrise,sunset);
              let airportIndex1=this.airports.map(e => e.threeLetter).indexOf(legInfo.destination);
              if (this.airports[airportIndex1]) {
                times1=SunCalc.getTimes(new Date(element.on),this.airports[airportIndex1].latitude, this.airports[airportIndex1].longitude);
                dawn1=this.moment(times1.dawn);
                dusk1=this.moment(times1.dusk);
                sunrise1=this.moment(times1.sunrise).subtract(1,'hours');
                sunset1=this.moment(times1.sunset).add(1,'hours');
                if (isNaN(new Date(momentOn))||isNaN(new Date(dawn1))||isNaN(new Date(dusk1))) onNight=false;
                else onNight=!momentOn.isBetween(dawn1,dusk1);
                if (isNaN(new Date(momentOn))||isNaN(new Date(sunrise))||isNaN(new Date(sunset1))) onNightLnd=false;
                else onNightLnd=!momentOn.isBetween(sunrise1,sunset1);
              }
              if (offNightLnd) {
                if (flightInfo.aircraftCode<130||flightInfo.aircraftCode>133) legInfo.nightTO++;
                else legInfo.nightTOMulti++;
              }
              else {
                if (flightInfo.aircraftCode<130||flightInfo.aircraftCode>133) legInfo.dayTO++;
                else legInfo.dayTOMulti++;
              }
              if (offNight){
                if (onNight) legInfo.night=legInfo.flightTimeMinutes;
                else legInfo.night=Math.floor(this.moment.duration(dawn.diff(momentOff)).asMinutes());
              }
              else {
                if (onNight) legInfo.night=Math.floor(this.moment.duration(momentOn.diff(dusk)).asMinutes());
              }
              if (onNightLnd) {
                if (flightInfo.aircraftCode<130||flightInfo.aircraftCode>133) legInfo.nightLND++;
                else legInfo.nightLNDMulti++;
              }
              else {
                if (flightInfo.aircraftCode<130||flightInfo.aircraftCode>133) legInfo.dayLND++;
                else legInfo.dayLNDMulti++;
              }
            }
            else {
              if (flightInfo.aircraftCode<130||flightInfo.aircraftCode>133) {
                legInfo.dayTO++;
                legInfo.dayLND++;
              }
              else {
                legInfo.dayTOMulti++;
                legInfo.dayLNDMulti++;
              }
            }
            flightInfo.night+=legInfo.night;
            flightInfo.dayTO+=legInfo.dayTO;
            flightInfo.dayLND+=legInfo.dayLND;
            flightInfo.nightTO+=legInfo.nightTO;
            flightInfo.nightLND+=legInfo.nightLND;
            flightInfo.dayTOMulti+=legInfo.dayTOMulti;
            flightInfo.dayLNDMulti+=legInfo.dayLNDMulti;
            flightInfo.nightTOMulti+=legInfo.nightTOMulti;
            flightInfo.nightLNDMulti+=legInfo.nightLNDMulti;
            if (this.multiple&&legInfo.flightTimeMinutes>0) csv+=this.addCsvLine(legInfo);
          });
          if (!this.multiple&&flightInfo.flightTimeMinutes>0) csv+=this.addCsvLine(flightInfo);
          this.flights.push(flightInfo);
        }
      }
      this.csv=csv;
  }
  
  addCsvLine(flightInfo){
    if (flightInfo.night>flightInfo.flightTimeMinutes) flightInfo.night=flightInfo.flightTimeMinutes;
    //"TODay,LdgDay,TONight,LdgNight,TimeOff,TimeOn,FlightDate,Aircraft,AircraftCode,origin,destination,intermediate,DepCode,ArrCode,minTotal,minPIC,minXC,minIFR,P1Code,PF,CurrRent,CurrPilot,CurrPerDiem,BaseOffSet,DepOffset,ArrOffset,FlightNumber,Remarks,TypeOfInstr,NextPage,Pairing,UserN2,Report,minNight,";//"date,aircraft,startLocation,endLocation,intermediateLocations,totalFlightTime,landings";
    let csvLine="";
    if (flightInfo.dayTO===0) flightInfo.dayTO=flightInfo.dayTOMulti;
    if (flightInfo.nightTO===0) flightInfo.nightTO=flightInfo.nightTOMulti;
    if (flightInfo.dayLND===0) flightInfo.dayLND=flightInfo.dayLNDMulti;
    if (flightInfo.nightLND===0) flightInfo.nightLND=flightInfo.nightLNDMulti;
    csvLine+=flightInfo.dayTO+','+flightInfo.dayLND+',';
    csvLine+=flightInfo.nightTO+','+flightInfo.nightLND+',';
    csvLine+=flightInfo.timeOff+','+flightInfo.timeOn+',';
    csvLine+=flightInfo.dateString+',';
    csvLine+=flightInfo.aircraft+','+flightInfo.aircraftCode+',';
    csvLine+=flightInfo.departure+','+flightInfo.destination+','+flightInfo.intermediates+',';
    csvLine+=flightInfo.departureCode + ',' + flightInfo.destinationCode + ',';
    csvLine+=flightInfo.flightTimeMinutes+','+flightInfo.flightTimeMinutes+','+flightInfo.flightTimeMinutes+','+flightInfo.flightTimeMinutes+',';
    csvLine+='1,1,9,9,9,-540,-540,-540,';
    csvLine+=flightInfo.flightNumber+','+flightInfo.intermediates+',';
    csvLine+=" ,0, , , ,"+flightInfo.night;
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
    tab++;
    for (let x=0;x<8;x++) {
      let t=tab+x;
      this.fields['T'+t]=['---'];
    }
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
  
  afterFlightDataLoaded(){
    if (this.monthly) this.generateMonthly();
    else this.convertToCSV();
  }

  loadFromFirebase(){
    const emp = (this.empNum && String(this.empNum).trim()) || '933';
    const start = this.moment(this.startDate).format('YYYY-MM-DD');
    const end = this.moment(this.endDate).format('YYYY-MM-DD');
    this.loading = true;
    this.fullyComplete = false;
    this.complete = false;
    this.http.get('/api/flights/flight-index/' + encodeURIComponent(emp), {
      params: { start, end }
    }).then(res => {
      this.Json = res.data;
      if (!this.Json || !this.Json.length) {
        alert('No flightIndex rows in that date range for employee ' + emp);
        this.loading = false;
        return;
      }
      this.afterFlightDataLoaded();
      this.loading = false;
    }).catch(err => {
      this.fullyComplete = false;
      this.loading = false;
      console.log(err);
      const msg = (err.data && err.data.error) ? err.data.error : 'Firebase load failed';
      alert(msg);
    });
  }

  add(){
    this.loading=true;
    this.fullyComplete=false;
    let f = document.getElementById('file').files[0];
    let r = new FileReader();
      r.onloadend = e=>{
        this.http.post('/api/workouts/upload',{data:btoa(e.target.result)}).then(res=>{
          this.Json=res.data[0];//JSON.parse(res.data)[0];
          //console.log(this.Json);
          this.afterFlightDataLoaded();
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
