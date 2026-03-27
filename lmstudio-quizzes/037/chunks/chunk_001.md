---
chunk: 1
total: 5
---

© Michael Turek
COMPUTER NETWORKS - LABORATORY 037
Subject:
Configure Cisco routers - Serial interfaces.
Task A: Configuring Cisco router Serial interfaces
- Prepare two Cisco routers having serial interfaces
(Modules Cisco WIC 1T, 2T Cisco WIC, Cisco NM Serial 8A / S, Cisco PA 4T or
4T Cisco NM Serial socket SmartSerial or DB60).
Connect the devices as below:
- In each of the routers a serial select the interface to configure. The name of
interface is dependent on device’s installed expansion cards and base interfaces
present. These are, for example: serial 0/0 or s 0/0:
Router (config) #interface serial 0/0
Router (config-if) #
First select a type of encapsulation used in the serial link: PPP (Point-to-Point
Protocol) or - HDLC (High Level Data Link Control). Encapsulation type must be
compatible in both interfaces (discrepancy will result in continuous on and off link
protocol switching - so-called “flapping” of the interface):
Router (config-if) #encapsulation ppp
or
Router (config-if) #encapsulation hdlc
Then define the IP addresses of the both interfaces involved:
Router (config-if)#ip address 200.200.200.1 255.255.255.0
Router (config-if)#no shutdown
- In the case of a router having a serial interface to determine DCE clock speed
links, e.g. .:
Router (config-if)#clock rate 250000


## Naturally IP addressing for all used interfaces must be developed independently

and meet the generally known rules.
- Check the link settings:
Router # show ip int serial 0 / 0