---
chunk: 2
total: 5
---

## Router show run

Router # show controllers serial 0/0

-- 1 of 5 --

and check (ping between routers) the ability to transmit IP datagrams over the link
serial.
Warning: communication between the PC will not yet be possible (it would be
necessary configuring IP routing processes on both routers)
- Change the mode of framing in both the opposite interfaces (PPP or HDLC) and
re-test the functioning of the connection
Task B: PAP (Password Authentication Protocol) for PPP Serial
links
- The installation of the previous task, you must enter the remote identification
system router-based authentification PAP.
Note ! PAP and CHAP works only over PPP (it does not work on HDLC, so even
proper commands won’t be available)
The principle of operation PAP: router logs on the opposite side of the link with the
user names and passwords defined there.
- The router, which will accept the serial connection and requires authorization,
define a user's password (the data on the two sides may be different). These will
be the local user data, which must be used at the remote side authentication PAP:
Router1 (config) #username cisco priv 15 password cisco
Then enter the router serial interface configuration forcing the PAP login:
Router1(Config) #int serial 0/ 0
Router1(Config-if) #PPP authentication PAP
In the opposite router (Interface Configuration) define a rule requiring logging in
the remote site using the specified credentials:
Router2(Config) #int serial 0/ 0
Router2(Config-if) #PPP PAP sent-username cisco password cisco
Login information for both parties must comply.
- Connect and turn on PAP authentication tracking:
Router # debug PPP authentication
Disable track after login test:
Router # no debug PPP authentication
- Switch the interface off and then on again, observing serial link re-authorization
process (switching on and off will force it):
Router (config-if) #sh
Router (config-if) #no sh
- Add authentication "in the opposite direction" (“a server” router will also be
authorized). Test (debug) the link operation as before.
Task C: CHAP (Challenge Handshake Authentication Protocol) for