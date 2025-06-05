// Script per login rapido admin e test servizi
const adminCredentials = {
  username: 'zambelli.andrea.1973@gmail.com',
  password: 'gironiCO73%'
};

async function loginAndTest() {
  try {
    // 1. Login admin
    const loginResponse = await fetch('/api/staff/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminCredentials),
      credentials: 'include'
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    console.log('✅ Admin login successful');
    
    // 2. Test servizi esistenti
    const servicesResponse = await fetch('/api/services', {
      credentials: 'include'
    });
    
    if (servicesResponse.ok) {
      const services = await servicesResponse.json();
      console.log('📋 Servizi esistenti:', services);
    }
    
    // 3. Crea servizio test
    const testService = {
      name: `test-${Date.now()}`,
      duration: 60,
      price: 50,
      color: '#ff0000',
      description: 'Servizio di test'
    };
    
    const createResponse = await fetch('/api/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testService),
      credentials: 'include'
    });
    
    if (createResponse.ok) {
      const newService = await createResponse.json();
      console.log('✅ Servizio creato:', newService);
      
      // 4. Verifica lista aggiornata
      const updatedResponse = await fetch('/api/services', {
        credentials: 'include'
      });
      
      if (updatedResponse.ok) {
        const updatedServices = await updatedResponse.json();
        console.log('📋 Lista aggiornata:', updatedServices);
      }
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

// Esegui test
loginAndTest();