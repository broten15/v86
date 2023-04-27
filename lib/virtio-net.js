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
    console.log("√ in virtio net constructor test");



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
                    // while(this.recv_virtqueue.has_request())
                    // {
                    //     console.log("√", "we got a a send buff");
                    //     const bufchain = this.recv_virtqueue.pop_request();
                    //     this.ReceiveRequest(bufchain);
                    // }
                    // this.recv_virtqueue.notify_me_after(0);
                    // Don't flush replies here: async replies are not completed yet.
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

VirtioNet.prototype.set_state = function(state) {
    console.log("√", state);
}

/* 

OPEN OASIS VIRTIO
    5.1.6.3 Setting Up Receive Buﬀers
        It is generally a good idea to keep the receive virtqueue as fully populated as possible: if it runs out, network performance will suﬀer.
        If the VIRTIO_NET_F_GUEST_TSO4, VIRTIO_NET_F_GUEST_TSO6 or VIRTIO_NET_F_GUEST_UFO features are used, the Driver will need to accept packets of up to 65550 bytes long (the maximum size of a TCP or UDP packet, plus the 14 byte ethernet header), otherwise 1514. bytes. So unless VIRTIO_NET_F_MRG_RXBUF is negotiated, every buﬀer in the receive queue needs to be at least this length.11
        If VIRTIO_NET_F_MRG_RXBUF is negotiated, each buﬀer must be at least the size of the struct virtio_net_hdr.

    5.1.6.3.1 Packet Receive Interrupt
        When a packet is copied into a buﬀer in the receiveq, the optimal path is to disable further interrupts for the receiveq (see 3.2.2 Receiving Used Buﬀers From The Device) and process packets until no more are found, then re-enable them.
        Processing packet involves:  THIS IS ALREADY DONE BY THE HANDLER MADE DURING INITIALIZATION

        If the driver negotiated the VIRTIO_NET_F_MRG_RXBUF feature, then the “num_buﬀers” ﬁeld indicates how many descriptors this packet is spread over (including this one). This allows receipt of large packets without having to allocate large buﬀers. In this case, there will be at least “num_buﬀers” in the used ring, and they should be chained together to form a single packet. The other buﬀers will not begin with a struct virtio_net_hdr.
        If the VIRTIO_NET_F_MRG_RXBUF feature was not negotiated, or the “num_buﬀers” ﬁeld is one, then the entire packet will be contained within this buﬀer, immediately following the struct virtio_net_hdr.
        If the VIRTIO_NET_F_GUEST_CSUM feature was negotiated, the VIRTIO_NET_HDR_F_NEEDS_CSUM bit in the “ﬂags” ﬁeld may be set: if so, the checksum on the packet is incomplete and the “ csum_start” and “csum_oﬀset” ﬁelds indicate how to calculate it (see Packet Transmission point 1).
        If the VIRTIO_NET_F_GUEST_TSO4, TSO6 or UFO options were negotiated, then the “gso_type” may be something other than VIRTIO_NET_HDR_GSO_NONE, and the “gso_size” ﬁeld indicates the desired MSS (see Packet Transmission point 2).

FROM LINUX KERNEL
    static int virtnet_receive(struct receive_queue *rq, int budget,
                unsigned int *xdp_xmit)
    {
        struct virtnet_info *vi = rq->vq->vdev->priv;
        struct virtnet_rq_stats stats = {};
        unsigned int len;
        void *buf;
        int i;

        if (!vi->big_packets || vi->mergeable_rx_bufs) {
            void *ctx;

            while (stats.packets < budget &&
                (buf = virtqueue_get_buf_ctx(rq->vq, &len, &ctx))) {
                receive_buf(vi, rq, buf, len, ctx, xdp_xmit, &stats);
                stats.packets++;
            }
        } else {
            while (stats.packets < budget &&
                (buf = virtqueue_get_buf(rq->vq, &len)) != NULL) {
                receive_buf(vi, rq, buf, len, NULL, xdp_xmit, &stats);
                stats.packets++;
            }
        }

        if (rq->vq->num_free > min((unsigned int)budget, virtqueue_get_vring_size(rq->vq)) / 2) {
            if (!try_fill_recv(vi, rq, GFP_ATOMIC)) {
                spin_lock(&vi->refill_lock);
                if (vi->refill_enabled)
                    schedule_delayed_work(&vi->refill, 0);
                spin_unlock(&vi->refill_lock);
            }
        }

        u64_stats_update_begin(&rq->stats.syncp);
        for (i = 0; i < VIRTNET_RQ_STATS_LEN; i++) {
            size_t offset = virtnet_rq_stats_desc[i].offset;
            u64 *item;

            item = (u64 *)((u8 *)&rq->stats + offset);
            *item += *(u64 *)((u8 *)&stats + offset);
        }
        u64_stats_update_end(&rq->stats.syncp);

        return stats.packets;
    }


    main.js line 1640, eth-receive listener doesnt do anything with incoming packet
*/

VirtioNet.prototype.receive = function (data) {
    console.log("√","virtionet receive");
    dump_packet(data, "receive");
    //this.bus.send("eth-receive-end", [data.length]);
}

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

/*

OPEN OASIS VIRTIO
    5.1.6.2 Packet Transmission
        Transmitting a single packet is simple, but varies depending on the diﬀerent features the driver negotiated.

        If the driver negotiated VIRTIO_NET_F_CSUM, and the packet has not been fully checksummed, then the virtio_net_hdr’s ﬁelds are set as follows. Otherwise, the packet must be fully checksummed, and ﬂags is zero.
        ﬂags has the VIRTIO_NET_HDR_F_NEEDS_CSUM set,
        csum_start is set to the oﬀset within the packet to begin checksumming, and
        csum_oﬀset indicates how many bytes after the csum_start the new (16 bit ones’ complement) checksum should be placed.
        For example, consider a partially checksummed TCP (IPv4) packet. It will have a 14 byte ethernet header and 20 byte IP header followed by the TCP header (with the TCP checksum ﬁeld 16 bytes into that header). csum_start will be 14+20 = 34 (the TCP checksum includes the header), and csum_oﬀset will be 16. The value in the TCP checksum ﬁeld should be initialized to the sum of the TCP pseudo header, so that replacing it by the ones’ complement checksum of the TCP header and body will give the correct result.

        If the driver negotiated VIRTIO_NET_F_HOST_TSO4, TSO6 or UFO, and the packet requires TCP segmentation or UDP fragmentation, then the “gso_type” ﬁeld is set to VIRTIO_NET_HDR_GSO_TCPV4, TCPV6 or UDP. (Otherwise, it is set to VIRTIO_NET_HDR_GSO_NONE). In this case, packets larger than 1514 bytes can be transmitted: the metadata indicates how to replicate the packet header to cut it into smaller packets. The other gso ﬁelds are set:
        hdr_len is a hint to the device as to how much of the header needs to be kept to copy into each packet, usually set to the length of the headers, including the transport header.8
        gso_size is the maximum size of each packet beyond that header (ie. MSS).
        If the driver negotiated the VIRTIO_NET_F_HOST_ECN feature, the VIRTIO_NET_HDR_GSO_ECN bit may be set in “gso_type” as well, indicating that the TCP packet has the ECN bit set.9
        If the driver negotiated the VIRTIO_NET_F_MRG_RXBUF feature, the num_buﬀers ﬁeld is set to zero.
        The header and packet are added as one output buﬀer to the transmitq, and the device is notiﬁed of the new entry (see 5.1.5 Device Initialization).10

    5.1.6.2.1 Packet Transmission Interrupt
        Often a driver will suppress transmission interrupts using the VRING_AVAIL_F_NO_INTERRUPT ﬂag (see 5.2 Block Device) and check for used packets in the transmit path of following packets.
        The normal behavior in this interrupt handler is to retrieve and new descriptors from the used ring and free the corresponding headers and packets.

FROM LINUX KERNEL
    static bool virtnet_send_command(struct virtnet_info *vi, u8 class, u8 cmd,
        struct scatterlist *out)
    {
    struct scatterlist *sgs[4], hdr, stat;
    unsigned out_num = 0, tmp;
    int ret;

    / / Caller should know better
    BUG_ON(!virtio_has_feature(vi->vdev, VIRTIO_NET_F_CTRL_VQ));

    vi->ctrl->status = ~0;
    vi->ctrl->hdr.class = class;
    vi->ctrl->hdr.cmd = cmd;
    / / Add header
    sg_init_one(&hdr, &vi->ctrl->hdr, sizeof(vi->ctrl->hdr));
    sgs[out_num++] = &hdr;

    if (out)
    sgs[out_num++] = out;

    / / Add return status.
    sg_init_one(&stat, &vi->ctrl->status, sizeof(vi->ctrl->status));
    sgs[out_num] = &stat;

    BUG_ON(out_num + 1 > ARRAY_SIZE(sgs));
    ret = virtqueue_add_sgs(vi->cvq, sgs, out_num, 1, vi, GFP_ATOMIC);
    if (ret < 0) {
    dev_warn(&vi->vdev->dev,
    "Failed to add sgs for command vq: %d\n.", ret);
    return false;
    }

    if (unlikely(!virtqueue_kick(vi->cvq)))
    return vi->ctrl->status == VIRTIO_NET_OK;

    / / Spin for a response, the kick causes an ioport write, trapping
    / / into the hypervisor, so the request should be handled immediately.

    while (!virtqueue_get_buf(vi->cvq, &tmp) &&
        \ !virtqueue_is_broken(vi->cvq))
    cpu_relax();

    return vi->ctrl->status == VIRTIO_NET_OK;
    }

*/

VirtioNet.prototype.TransmitPacket = async function (bufchain) {
    // dbg_assert(this.replybuffersize >= 0, "9P: Negative replybuffersize");
    // bufchain.set_next_blob(this.replybuffer.subarray(0, this.replybuffersize));
    // this.virtqueue.push_reply(bufchain);
    // this.virtqueue.flush_replies();
};
