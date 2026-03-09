## File naming
To make responsibilities clear, each file/module has its own type:

### Service
A service owns the lifecycle/state of a subsystem and exposes operations to the main program or other services.
It may run background tasks, but it doesn't have to. Services can use global context.

### Client
A client builds requests to external resources (web-server, etc.) and is used by a service.
It should not depend on global context. Any inputs it needs should be passed by the calling service.
Local internal state (e.g., handles, cached tokens) is OK.

### Helper
Small utility module that hides implementation complexity by wrapping dependencies with a simplified API.

### Config
Global state (data only) accessed by services and main program. Loading/validation logic belongs in a service.
