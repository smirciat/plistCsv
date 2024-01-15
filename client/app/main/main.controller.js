'use strict';

(function(){

class MainController {
  constructor($http,$timeout,$interval,$scope) {
    //plutil -convert xml1 *.plist
    //1.  bring over plutil formatted xml file after conversion, originally from ipad backup
    //2.  upload into pdfs folder in IDE
    //3.  update url target in line 38
    //4.  update this.startDate for beginning flight records to import line 14
    //4.  open /xml route, wait for console.log, then click download
    //5.  result.csv can be imported into database file for mccPilotLog (watch for nulls)
    this.startDate=new Date('5/24/2023');//now done through 1/9/2024
    this.http=$http;
    this.timeout=$timeout;
    this.interval=$interval;
    this.scope=$scope;
    var d;
    this.Json="";
    this.file=undefined;
    this.fileExists=false;
    this.loading=false;
    this.multiple=false;
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
    this.myInterval=this.interval(()=>{
      var fileWatch=undefined;
      var d=document.getElementById('file');
      if (d) fileWatch=d.files;
      if (fileWatch&&fileWatch.length>0) {
        this.fileExists=true;
        this.interval.cancel(this.myInterval);
      }
    },1000);
  }
  
  convertToCSV(){
    //this.http({ url: "/pdf?filename=FlightIndex.plist",//2024_01_06_14_01_timber_Albany,_OR,_United_States.tcx", 
    //      method: "GET", 
    //      responseType: 'text' })
    //    .then(response=> {
          if (!this.Json||!Array.isArray(this.Json)||this.Json.length===0) return;
          //const parser = new DOMParser();
          //const srcDOM = parser.parseFromString(this.jsonPlist, "application/xml");
          var csvHeader="TODay,LdgDay,TimeOff,TimeOn,FlightDate,Aircraft,AircraftCode,origin,destination,intermediate,DepCode,ArrCode,minTotal,minPIC,minXC,minIFR,P1Code,PF,CurrRent,CurrPilot,CurrPerDiem,BaseOffSet,DepOffset,ArrOffset,FlightNumber,Remarks,TypeOfInstr,NextPage,Pairing,UserN2,Report";//"date,aircraft,startLocation,endLocation,intermediateLocations,totalFlightTime,landings";
          var csv=csvHeader+"\n";
          var flightInfo,month,index,ftArray,dash,monthString,dayString;
          //this.Json=this.jsonPlist;//this.xml2json(srcDOM);
          for (var x=0;x<this.Json.length;x++) {
            if (!this.Json[x]||this.Json[x].acftNumber===undefined||
                    this.Json[x].acftNumber==="") continue;
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
            
          }
          //console.log(csv);
          var blob = new Blob([ csv ], { type : 'text/plain' });
          this.url = (window.URL || window.webkitURL).createObjectURL( blob );//window.location???
          this.complete=true;
          this.fullyComplete=false;
          this.loading=false;
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
  
  xml2json(srcDOM) {
    var children = [...srcDOM.children];
    
    // base case for recursion. 
    if (!children.length) {
      return srcDOM.innerHTML;
    }
    
    // initializing object to be returned. 
    var jsonResult = {};
    
    for (var child of children) {
      
      // checking is child has siblings of same name. 
      var childIsArray = children.filter(eachChild => eachChild.nodeName === child.nodeName).length > 1;
  
      // if child is array, save the values as array, else as strings. 
      if (childIsArray) {
        if (jsonResult[child.nodeName] === undefined) {
          jsonResult[child.nodeName] = [this.xml2json(child)];
        } else {
          jsonResult[child.nodeName].push(this.xml2json(child));
        }
      } else {
        jsonResult[child.nodeName] = this.xml2json(child);
      }
    }
    
    return jsonResult;
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
    //console.log(f);
    var r = new FileReader();
      r.onloadend = e=>{
        this.data = e.target.result;
        //convert data to blob?
        this.http.post('/api/workouts/upload',{data:btoa(this.data)}).then(res=>{
          this.Json=JSON.parse(res.data)[0];
          //console.log(this.Json)
          this.convertToCSV();
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
