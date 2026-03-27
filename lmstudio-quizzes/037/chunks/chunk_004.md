---
chunk: 4
total: 5
---

## If you have multiple parallel serial links between routers it is possible to aggregate

these links into logical one (similar to EtherChannel / LAG Ethernet technology).
- Prepare two Cisco routers connected by two serial links as shown below
- In both routers, configure a virtual multilink interface giving him a number. Specify
multilink interface IP addresses (so that they were in the same IP network):
R1(Config) #interface multilink 1
R1(Config-if) #ip address 200.200.205.1 255.255.255.0
R2(Config) #interface multilink 1

-- 3 of 5 --

R2(Config-if) #ip address 200.200.205.2 255.255.255.0
- In the next step, configure and assign to the multilink (of previously selected
number) some physical serial interfaces (including it in a PPP multilink
connection). Note that there are no defined serial interface IP addresses any
more (interfaces will now multilink interface components):
Router (config) #int serial 0/3/0
Router (config-if) #encapsulation ppp
Router (config-if) #ppp multilink
Router (config-if) #ppp multilink group 1
Router (config-if) #clock rate 1000000
Router (config-if) #no shut
- Check the status of PPP multilink:
router #show ppp multilink
router #debug ppp multilink events
Check (ping) the communication between routers in a multilink PPP. Notice that
link still works after one of the cables was disconnected.
- Prove the existence of PPP multilink fragmentation. For this purpose switch
diagnostic mode on router R1 (watching packets through the interface multilink:
R1#debug ppp multilink fragments
Then send the router R2 to the router R1 to ping one datagram ICMP extended
length
R2(config) #ping 200.200.205.1 rep 1 size 40000
In the resulting report, check the size and number of datagrams transmitted.
Task E: Serial ports hardware extensions
- You can overbuild an IP interface over a simple async link (like Cisco console or
AUX line). So if you have a spare AUX line socket in two routers (RS-232 async) it is
possible to use it as communication link between. Connect two AUX sockets in
routers with Cisco Console Rollover cable.
In routers, configure the lines:
Router (config) #line aux 0
Router (config-line) #mode InOut
Router (config-line) #transport input all
Router (config-line) #flowcontrol hardware
Check the number of newly defined async interface:
Router # show line

-- 4 of 5 --