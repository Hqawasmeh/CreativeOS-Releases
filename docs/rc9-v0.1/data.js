window.QanteakData={
  workspace:{name:'Qanteak Studio',owner:'Hamza',currency:'USD'},
  projects:[
    {id:'nike-campaign',name:'Nike Campaign',clientId:'nike',type:'Brand campaign',status:'Client review',progress:78,due:'2026-09-10',budget:12000,expenses:3200,timeCost:2100,summary:'Launch campaign system with key visuals, motion variants and delivery assets.',tags:['Campaign','Priority'],tasks:['prepare-review','alternate-headline','delivery-checklist'],files:['nike-key-visual','nike-social'],documents:['nike-brief','nike-meeting'],activity:[['18m','Sarah commented on Review #3'],['2h','nike-social-9x16.mp4 approved'],['Yesterday','Creative brief updated']]},
    {id:'brand-identity',name:'Brand Identity',clientId:'north-studio',type:'Identity system',status:'On track',progress:55,due:'2026-09-21',budget:8400,expenses:1350,timeCost:1900,summary:'Brand identity system, guidelines and launch-ready digital assets.',tags:['Identity'],tasks:['proposal-revision'],files:['brand-guidelines'],documents:['brand-guidelines-doc'],activity:[['Today','Brand guidelines v4 uploaded'],['Yesterday','Estimate accepted']]},
    {id:'wedding-film',name:'Wedding Film',clientId:'sarah-adam',type:'Film delivery',status:'Due tomorrow',progress:92,due:'2026-09-07',budget:4800,expenses:600,timeCost:1150,summary:'Final film mastering, exports, review sign-off and secure delivery.',tags:['Delivery','Urgent'],tasks:['final-export'],files:['wedding-master'],documents:[],activity:[['1h','Delivery checklist updated'],['Today','Final export still open']]}
  ],
  clients:[
    {id:'nike',name:'Nike',industry:'Sportswear',status:'Active',lifetimeValue:34200,outstanding:4500,relationship:'18 months',email:'creative@nike.example',projects:['nike-campaign'],portal:true,activity:[['18m','Review comment received'],['2d','Invoice #104 viewed']]},
    {id:'north-studio',name:'North Studio',industry:'Creative studio',status:'Active',lifetimeValue:18600,outstanding:0,relationship:'11 months',email:'hello@northstudio.example',projects:['brand-identity'],portal:true,activity:[['2h','Estimate #EST-018 accepted'],['Yesterday','Brand guideline notes added']]},
    {id:'sarah-adam',name:'Sarah & Adam',industry:'Private client',status:'Review',lifetimeValue:4800,outstanding:1200,relationship:'4 months',email:'client@example.com',projects:['wedding-film'],portal:true,activity:[['5h','Invoice #105 viewed'],['Today','Delivery page opened']]}
  ],
  leads:[
    {id:'atlas',name:'Atlas Coffee',value:6200,stage:'Contacted',source:'Website',next:'Follow up Sep 8'},
    {id:'kinetic',name:'Kinetic Labs',value:9800,stage:'Meeting',source:'Referral',next:'Discovery Sep 9'},
    {id:'mira',name:'Mira Hotels',value:14500,stage:'Proposal',source:'Partner',next:'Proposal sent'},
    {id:'field',name:'Field Works',value:5200,stage:'Won',source:'Inbound',next:'Create project'}
  ],
  tasks:[
    {id:'prepare-review',title:'Prepare campaign review',projectId:'nike-campaign',due:'10:30',done:false,priority:'High'},
    {id:'proposal-revision',title:'Send revised proposal',projectId:'brand-identity',due:'13:00',done:false,priority:'Normal'},
    {id:'final-export',title:'Final export',projectId:'wedding-film',due:'Today',done:false,priority:'Urgent'},
    {id:'alternate-headline',title:'Prepare alternate headline option',projectId:'nike-campaign',due:'Tomorrow',done:false,priority:'Normal'},
    {id:'delivery-checklist',title:'Confirm delivery package',projectId:'nike-campaign',due:'Sep 10',done:false,priority:'Normal'}
  ],
  invoices:[
    {id:'104',clientId:'nike',projectId:'nike-campaign',amount:2400,status:'Overdue',due:'7 days ago'},
    {id:'105',clientId:'sarah-adam',projectId:'wedding-film',amount:1200,status:'Sent',due:'Sep 12'},
    {id:'106',clientId:'north-studio',projectId:'brand-identity',amount:3300,status:'Paid',due:'Sep 03'}
  ],
  files:[
    {id:'nike-key-visual',name:'nike-key-visual.psd',projectId:'nike-campaign',version:6,current:true,review:'Review',updated:'18m ago'},
    {id:'nike-social',name:'nike-social-9x16.mp4',projectId:'nike-campaign',version:3,current:true,review:'Approved',updated:'2h ago'},
    {id:'brand-guidelines',name:'brand-guidelines.pdf',projectId:'brand-identity',version:4,current:true,review:'Approved',updated:'Yesterday'},
    {id:'wedding-master',name:'wedding-master.mov',projectId:'wedding-film',version:8,current:true,review:'Needs export',updated:'Today'}
  ],
  documents:[
    {id:'nike-brief',title:'Nike Campaign — Creative Brief',projectId:'nike-campaign',kind:'Brief',updated:'Today'},
    {id:'nike-meeting',title:'Meeting Notes — Nike',projectId:'nike-campaign',kind:'Notes',updated:'Today'},
    {id:'brand-guidelines-doc',title:'Brand Guidelines',projectId:'brand-identity',kind:'Knowledge',updated:'Yesterday'},
    {id:'kickoff-sop',title:'Project Kickoff SOP',projectId:null,kind:'SOP',updated:'4 days ago'}
  ],
  automations:[
    {id:'invoice-reminder',name:'Overdue invoice reminder',enabled:true,trigger:'Invoice overdue 7 days',action:'Draft payment reminder'},
    {id:'review-complete',name:'Review approved → complete task',enabled:true,trigger:'Review approved',action:'Complete linked task and advance project'},
    {id:'project-setup',name:'New project setup',enabled:true,trigger:'Project created',action:'Create folders, template tasks and brief'},
    {id:'client-followup',name:'Client follow-up',enabled:false,trigger:'Approval waits 3 days',action:'Create follow-up task'}
  ]
};