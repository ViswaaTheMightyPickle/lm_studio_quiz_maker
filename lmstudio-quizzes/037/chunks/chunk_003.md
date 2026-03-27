---
chunk: 3
total: 5
---

## PPP Serial links


-- 2 of 5 --

- The installation of the task A system should be introduced to identify the remote
router based on CHAP authentification (excluding pre-PAP). Principle of operation
CHAP: routers identify themselves by exchanging tokens in challenge mode -
response. These tokens are generated (MD5) based on a commonly held (so this
time converging!) User passwords. The names of users with the same password
is also the name of router (hostname) on opposite sides of the communication.
- The routers on both sides of the link, define a unique name for hostname:
Router 1 (config) #hostname R1
R1(Config) #
Router2 (config) #hostname R2
R2(Config) #
- The routers on both sides of the serial link, define the user name that is the name
that the hostname has the opposite router. In addition - both user accounts must
have the same password:
R1(Config) #username R2 password pass
R2(Config) #username R1 password pass
Note: The values are case-sensitive.
- The serial interfaces on both sides of the router configuration, enter the login
```
forcing challenge handshake on the remote router when the serial connection
(remember to remove any configuration tasks from the previous PAP): R1 (config)
#int serial 0
R1(Config-if) #PPP authentication CHAP
R2(Config) #int serial 0
R2(Config-if) #PPP authentication CHAP
- Turn on tracing and connect CHAP:
Router # debug PPP authentication
Disable track after login test:
Router # debug no PPP authentication
Task D: Multilink PPP