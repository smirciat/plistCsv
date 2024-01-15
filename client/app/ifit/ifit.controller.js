'use strict';

(function(){

class IfitComponent {
  constructor($http,$timeout) {
    this.http=$http;
    this.timeout=$timeout;
    this.workouts=[];
    this.test="test";
    this.fields=['name','date','maxSpeed','avgSpeed','miles','time','avgHR','maxHR'];
    this.fieldTitles=['Workout Name','Date','MaxSpeed','AvgSpeed','Miles','Min:Sec','Avg HR','Max HR'];
  }
  
  $onInit(){
    this.http.get('/api/workouts/some').then(res=>{
      this.workouts=res.data;
      this.workouts.forEach(workout=>{
        //workout.raw=JSON.parse(workout.raw);
        workout.jsDate=new Date(workout.date);
        this.anchorClick(workout._id);
      });
    });
    
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
  
  add(){
    this.timeout(()=>{console.log(this.workouts)},5000);
    var files = Array.from(document.getElementById('file').files);
    var r,data;
    files.forEach(f=>{
      var workout={};
      r = new FileReader();
      r.onloadend = e=>{
        data = e.target.result;
        //console.log(data)
        const parser = new DOMParser();
        const srcDOM = parser.parseFromString(data, "application/xml");
        workout.raw=this.xml2json(srcDOM).TrainingCenterDatabase.Activities.Activity;
        //console.log(workout.raw);
        workout.name=workout.raw.Notes;
        workout.date=new Date(workout.raw.Id).toLocaleDateString() + ' ' + new Date(workout.raw.Id).toLocaleTimeString();
        workout.jsDate=new Date(workout.raw.Id);
        workout.maxSpeed=Number(workout.raw.Lap.MaximumSpeed)*(100*60*60/(2.54*12*5280));
        workout.avgSpeed=Number(workout.raw.Lap.Extensions.LX.AvgSpeed)*(100*60*60/(2.54*12*5280));
        workout.miles=Number(workout.raw.Lap.Track.Trackpoint.at(-1).DistanceMeters)*(100/(2.54*12*5280));
        workout.time=Number(workout.raw.Lap.TotalTimeSeconds)/60;
        workout.avgHR=workout.raw.Lap.AverageHeartRateBpm.Value;
        workout.maxHR=workout.raw.Lap.MaximumHeartRateBpm.Value;
        workout.raw=JSON.stringify(workout.raw);
        this.http.post('/api/workouts',workout).then(res=>{
          console.log(res.data);
          workout._id=res.data._id;
          workout.raw=JSON.parse(workout.raw);
          this.workouts.push(workout);
        }).catch(err=>{
          console.log(err);
        });
      };
      r.readAsBinaryString(f);
    });
    
  }
  
  resync(workout){
    this.http.get('/api/workouts/'+workout._id).then(res=>{
      res.data.raw=JSON.parse(res.data.raw);
      res.data.jsDate=new Date(res.data.date);
      console.log(res.data);
      const pos = this.workouts.map(e => e._id).indexOf(workout._id);
      this.workouts.splice(pos,1);
      this.workouts.push(res.data);
    }).catch(err=>{
      console.log(err);
    });
  }
  
  updateRow(workout){
    if (workout.raw) workout.raw=JSON.stringify(workout.raw);
    this.http.put('/api/workouts/'+workout._id,workout).then(res=>{
      console.log('updated');
    }).catch(err=>{
      console.log(err);
    });
  }
  
  deleteRow(workout){
    this.http.delete('/api/workouts/'+workout._id).then(res=>{
      const pos = this.workouts.map(e => e._id).indexOf(workout._id);
      this.workouts.splice(pos,1);
    }).catch(err=>{
      console.log(err);
    });
  }
  
  anchorClick(id){
    this.fields.forEach(f=>{
      $(document).on("click","#a"+f+id, function(e) {
         e.preventDefault(); 
         $('#i'+f+id).focus();
         return false;
      });
    });
  }
  
  convertMinutes(minutesString){
    var minutes=Math.floor(Number(minutesString));
    var seconds=Math.round(60*(Number(minutesString)%minutes));
    if (seconds<10) seconds="0" + seconds;
    return minutes + ":" + seconds;
  }
  
  formatWorkout(workout,field){
    const pos=this.fields.indexOf(field);
    if (pos===2) return Number(workout[field]).toFixed(1);
    if (pos==3||pos===4) return Number(workout[field]).toFixed(2);
    if (pos===5) return this.convertMinutes(workout[field]);
    if (pos===6) return Number(workout[field]).toFixed(0);
    return workout[field];
  }
}

angular.module('plistCsvApp')
  .component('ifit', {
    templateUrl: 'app/ifit/ifit.html',
    controller: IfitComponent,
    controllerAs: 'ifit'
  });

})();
