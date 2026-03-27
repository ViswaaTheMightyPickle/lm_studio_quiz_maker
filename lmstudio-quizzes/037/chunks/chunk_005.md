---
chunk: 5
total: 5
---

Then configure that Async interface (using this particular number):
Router (config) #interface Async 65
Router (config-if) #ip address 200.200.200.1 255.255.255.0
Router (config-if) #encapsulation ppp
Router (config-if) #async default routing
Router (config-if) #async mode dedicated
where 65 is the example number assigned to Async interface by the system. IP
address must be configured according to the general principles (RS-232 is now an IP
network segment).
Async default routing command activates the IP routing on Async interface, and
async mode determines RS-232 as dedicated line (the default interface for IP traffic
over this hardware is async).
After configuring the serial interface check the communication (ping).
- HSSI (High Speed Serial Interface) link in Cisco routers:
If you have a NM HSSI card on your Cisco routers - connect Cisco HSSI cable.
Configure the interfaces on both sides according to the pattern:
Router1 (config) #int HSSI 1/0
Router1 (config-if) # HSSI internal-clock
Router1 (config-if) #ip address 200.200.200.1 255.255.255.0
Router 1 (config-if) #no sh
Router2 (config) #int HSSI 1/0
Router2 (config-if) # HSSI internal-clock
Router2 (config-if) #ip address 200.200.200.2 255.255.255.0
Router2 (config-if) #no sh
where again - interfaces addressing should be defined in accordance with the
general rules. After you configured the link - check (ping) the communication.
When DCE mode is enabled in HSSI, is possible to modify the clock speed (in HSSI
it is possible to modify clock speeds for both sides independently, so DCE mode can
be activated in both routers simultaneously):
Router 1 (config-if) #hssi DCE
Router 1 (config-if) #clock rate 5000
Router2 (config-if) #hssi DCE
Router2 (config-if) #clock rate 50000
Check effect of such modifications:
Router1 # ping 200.200.200.2 repeat 10000

-- 5 of 5 --

```