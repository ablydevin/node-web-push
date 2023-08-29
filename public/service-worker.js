self.addEventListener('push', event => {
    console.log(event)
    let data = event.data.json();
    console.log(data)
    console.log(data.options)
    const image = 'https://cdn.glitch.com/614286c9-b4fc-4303-a6a9-a4cef0601b74%2Flogo.png?v=1605150951230';
    const options = {
      body: data.options.body,
      icon: image
    }
    self.registration.showNotification(
      data.title, 
      options
    );
  });
  
  self.addEventListener('notificationclick', event => {
    console.log(event)
  });