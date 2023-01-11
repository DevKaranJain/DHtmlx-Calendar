import { LightningElement, api } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { loadStyle, loadScript } from "lightning/platformResourceLoader";
import { createRecord, updateRecord, deleteRecord } from "lightning/uiRecordApi";
 
// Static resources
import SchedulerFiles from "@salesforce/resourceUrl/dhtmlxscheduler";
 
// Controllers
import getEvents from "@salesforce/apex/SchedulerData.getEvents";
 
function unwrap(fromSF) {
    const data = fromSF.events.map((a) => ({
        id: a.Id,
        info: a.Name,
        start_date: a.Start_Date__c,
        end_date: a.End_Date__c,
        text: a.Text__c,
    }));
 
    return { data };
}
 
export default class SchedulerView extends LightningElement {
    static delegatesFocus = true;
 
    @api height;
    schedulerInitialized = false;
 
    renderedCallback() {
        if (this.schedulerInitialized) {
            return;
        }
        this.schedulerInitialized = true;
 
        Promise.all([
            loadScript(this, SchedulerFiles + "/dhtmlxscheduler.js")
            ,
            loadStyle(this, SchedulerFiles + "/codebase/sources/dhtmlxscheduler.css")
        ])
            .then(() => {
                console.log('file path ' ,SchedulerFiles ,"/codebase/sources/dhtmlxscheduler.js", JSON.parse(JSON.stringify(this)), JSON.stringify(this), window, this.scheduler, this._customScheduler, this.dhtmlxscheduler, Object.keys(window) );
                
                this.initializeUI();
                 console.log('hey in the then')
            })
            .catch((error) => {
                console.log('error => ' , error.message);
                 console.log('hey in the then')

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Error loading scheduler",
                        message: error.message,
                        variant: "error"
                    })
                );
            });
    }
 
    initializeUI() {
        // setTimeout(() => {
            const rootEle = this.template.querySelector(".thescheduler");
            rootEle.style.height = this.height + "px";
            let scheduler = window.Scheduler.getSchedulerInstance();
            console.log('window instance ' ,  window.Scheduler.getSchedulerInstance, JSON.parse(JSON.stringify(window.Scheduler)), JSON.stringify(window.Scheduler));
    
            //scheduler.templates = {};
            scheduler.templates.parse_date = (date) => new Date(date);
            scheduler.templates.format_date = (date) => date.toISOString();
            console.log('init 0', JSON.stringify(scheduler.config))
            //scheduler.config = {}; 
            scheduler.config.header = [
                "day",
                "week",
                "month",
                "date",
                "prev",
                "today",
                "next"
            ];
            console.log('init 1')
            scheduler.init(rootEle, new Date(), "week");
            console.log('init 2')


     
            getEvents().then((d) => {
     
                const chartData = unwrap(d);
                scheduler.parse({
                    events: chartData.data,
                });
            });

            scheduler.createDataProcessor(function (entity, action, data, id) {
                switch (action) {
                    case "create":
                        console.log("createEvent", data);
                        const insert = {
                            apiName: "SchedulerEvent__c",
                            fields: {
                                Name: data.info,
                                Start_Date__c: data.start_date,
                                End_Date__c: data.end_date,
                                Text__c: data.text
                            }
                        };
                        scheduler.config.readonly = true; // suppress changes 
                                                          //until saving is complete
                        return createRecord(insert).then((res) => {
                            scheduler.config.readonly = false;
                            return { tid: res.id, ...res };
                        });
                    case "update":
                        console.log("updateEvent", data);
                        const update = {
                            fields: {
                                Id: id,
                                Name: data.info,
                                Start_Date__c: data.start_date,
                                End_Date__c: data.end_date,
                                Text__c: data.text
                            }
                        };
                        return updateRecord(update).then(() => ({}));
                    case "delete":
                        return deleteRecord(id).then(() => ({}));
                }
            });
        // }, 0)
        //uncomment the following line if you use the Enterprise or Ultimate version
 
        ///↓↓↓ saving changes back to SF backend ↓↓↓
    }
}