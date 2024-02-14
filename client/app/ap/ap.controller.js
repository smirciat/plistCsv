'use strict';

(function(){

class ApComponent {
  constructor($http,$timeout) {
    this.message = 'Hello';
    this.http=$http;
    this.timeout=$timeout;
    this.threes=[];//['OME','OTZ','UNK','PHO','KVL','WTK','ORV','IAN','WLK','ABL','SHG','OBU','LUR','RDG','BKC','DRG','SHH','WAA','TNC','KTS','TLA','WMO','GLV','ELI','KKA','SKK','SMK','WBB','GAM','SVA','ANC']
    this.fours=[];//['PAOM','PAOT','PAUN','PAPO','PAVL','PAWN','PFNO','PAIK','PASK','PAFM','PAGH','PAOB','PALU','PADG','PABL','PADE','PASH','PAIW','PATC','PFKT','PATE','PAWM','PAGL','PFEL','PAKK','PFSH','PASM','WBB','PAGM','PASA','PANC']

    this.url1="https://api.synopticdata.com/v2/stations/latest?stid=";
    this.url2="&vars=metar&token=b5ad2e668eed40019f75295effe5e4f8";
    
  }
  
  $onInit(){
    console.log(this.threes);
    var index=-1;
    this.http.get('/api/airports').then(res=>{
      console.log(res.data)
      this.airports=res.data;
      this.fours.forEach((four,id)=>{
        this.timeout(()=>{
          var airport={};
          index=this.airports.map(e => e.fourLetter).indexOf(four);
          if (index===undefined||index<0) {
            airport.threeLetter=this.threes[id];
            airport.fourLetter=four;
            this.http.get(this.url1+four+this.url2).then(res=>{
              airport.latitude=res.data.STATION[0].LATITUDE;
              airport.longitude=res.data.STATION[0].LONGITUDE;
              this.http.post('/api/airports',airport).then(res=>{
                console.log(airport);
                this.airports.push(res.data);
              }).catch(err=>{
                console.log(err);
                console.log(airport);
              });
            }).catch(err=>{
              console.log(err);
              console.log(airport);
            });
          }
        },id*1000);
      });
    });
    this.http.get(this.url1+'PAOT'+this.url2).then(res=>{
      console.log(res.data);
    });
  }
  
}

angular.module('plistCsvApp')
  .component('ap', {
    templateUrl: 'app/ap/ap.html',
    controller: ApComponent,
    controllerAs: 'ap'
  });

})();
