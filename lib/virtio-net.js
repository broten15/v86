// TODO: move this later
const VIRTIO_NET_F_GUEST_CSUM =1
const VIRTIO_NET_F_CTRL_GUEST_OFFLOADS =2
const VIRTIO_NET_F_MAC =5
const VIRTIO_NET_F_GUEST_TSO4 =7
const VIRTIO_NET_F_GUEST_TSO6 =8
const VIRTIO_NET_F_GUEST_ECN =9
const VIRTIO_NET_F_GUEST_UFO =10
const VIRTIO_NET_F_HOST_TSO4 =11
const VIRTIO_NET_F_HOST_TSO6 =12
const VIRTIO_NET_F_HOST_ECN =13
const VIRTIO_NET_F_HOST_UFO =14
const VIRTIO_NET_F_MRG_RXBUF =15
const VIRTIO_NET_F_STATUS =16
const VIRTIO_NET_F_CTRL_VQ =17
const VIRTIO_NET_F_CTRL_RX =18
const VIRTIO_NET_F_CTRL_VLAN =19
const VIRTIO_NET_F_GUEST_ANNOUNCE=21


/**
 * @constructor
 *
 * @param {CPU} cpu
 * @param {BusConnector} bus
 */
function VirtioNet(cpu, bus) {
    /** @const @type {BusConnector} */
    this.bus = bus;
    console.log("√ in virtio net constructor");

    /** @type {VirtIO} */
    this.virtio = new VirtIO(cpu,
    {
        name: "virtio-net",
        pci_id: 0x06 << 3, // TODO: same as 9p for now
        device_id: 0x1041,
        subsystem_device_id: 1,
        common: 
        {
            initial_port: 0xA800,
            queues: 
            [
                {
                    size_supported: 32,
                    notify_offset: 0,
                },
                {
                    size_supported: 32,
                    notify_offset: 0,
                },
            ],
            features: 
            [
                VIRTIO_F_VERSION_1, 
                VIRTIO_F_RING_EVENT_IDX,
                VIRTIO_F_RING_INDIRECT_DESC,
            ], // TODO: what features are needed?
            on_driver_ok: () => {},
        },
        notification:
        {
            initial_port: 0xA900,
            single_handler: false,
            handlers:
            [
                (queue_id) =>
                {
                    console.log("√", "in handler");
                    if(queue_id !== 0)
                    {
                        dbg_assert(false, "Virtio-net Notified for non-zero queue: " + queue_id +
                            " (expected queue_id of 0)");
                        return;
                    }
                },
            ],
        },
        isr_status:
        {
            initial_port: 0xA700,
        }
    });
    this.recv_virtqueue = this.virtio.queues[0];
    this.send_virtqueue = this.virtio.queues[1];

    console.log("√","virtionet bus register");
    this.bus.register("net0-receive", function(data)
    {
        this.receive(data);
    }, this);
    this.bus.register("net0-send", function(data)
    {
        //this.receive(data);
    }, this);
}


VirtioNet.prototype.receive = function (data) {
    console.log("√","virtionet receive");
    dump_packet(data, "receive");
    //this.bus.send("eth-receive-end", [data.length]);
}


// this is a copy
function dump_packet(packet, prefix)
{
    const ethertype = packet[12] << 8 | packet[13] << 0;
    if(ethertype === 0x0800)
    {
        const ipv4_packet = packet.subarray(14);
        const ipv4_len = ipv4_packet[2] << 8 | ipv4_packet[3];
        const ipv4_proto = ipv4_packet[9];
        if(ipv4_proto === 0x11)
        {
            const udp_packet = ipv4_packet.subarray(5 * 4);
            const source_port = udp_packet[0] << 8 | udp_packet[1];
            const destination_port = udp_packet[2] << 8 | udp_packet[3];
            const checksum = udp_packet[6] << 8 | udp_packet[7];

            if(source_port === 67 || destination_port === 67)
            {
                const dhcp_packet = udp_packet.subarray(8);
                const dhcp_chaddr = dhcp_packet.subarray(28, 28+6);
                console.log("√",prefix + " len=" + packet.length + " ethertype=" + h(ethertype) + " ipv4.len=" + ipv4_len + " ipv4.proto=" + h(packet[14 + 9]) + " udp.srcport=" + source_port + " udp.dstport=" + destination_port + " udp.chksum=" + h(checksum, 4) + " dhcp.chaddr=" + format_mac(dhcp_chaddr));
            }
            else
            {
                console.log("√",prefix + " len=" + packet.length + " ethertype=" + h(ethertype) + " ipv4.len=" + ipv4_len + " ipv4.proto=" + h(packet[14 + 9]) + " udp.srcport=" + source_port + " udp.dstport=" + destination_port + " udp.chksum=" + h(checksum, 4));
            }
        }
        else if(ipv4_proto === 0x01)
        {
        }
        else
        {
            console.log("√",prefix + " len=" + packet.length + " ethertype=" + h(ethertype) + " ipv4.len=" + ipv4_len + " ipv4.proto=" + h(packet[14 + 9]));
        }
    }
    else
    {
        const arp_packet = packet.subarray(14);
        console.log("√",prefix + " len=" + packet.length + " ethertype=" + h(ethertype) + " arp");
    }
    console.log("√",hex_dump(packet));
}




