let logger = console;
const socket = {};
const chatService = require("../service/chat-service");
const environment = require("../environments/environment");
const jwt = require("jsonwebtoken");

socket.config = (server) => {
  const io = require("socket.io")(server, {
    transports: ["websocket", "polling"],
    cors: {
      origin: "*",
    },
  });
  socket.io = io;
  let onlineUsers = [];

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.Authorization.split(" ")[1];
      if (!token) {
        const err = new Error("Unauthorized Access");
        return next(err);
      }
      let decoded = jwt.decode(token);
      jwt.verify(token, environment.JWT_SECRET_KEY, async (err, user) => {
        if (err) {
          const err = new Error("Invalid or Expired Token");
          return next(err);
        }
        socket.user = decoded.user;
        const chatData = await chatService.getRoomsIds(socket.user.id);
        if (chatData) {
          for (const roomId of chatData.roomsIds) {
            const chat = roomId;
            console.log(`${chat.roomId}`);
            socket.join(`${chat.roomId}`);
          }
          for (const groupId of chatData?.groupsIds) {
            const chat = groupId;
            socket.join(`${chat.groupId}`);
          }
        }
        socket.join(`${socket.user?.id}`);
        next();
      });
    } catch (error) {
      const err = new Error("Invalid or Expired Token");
      return next(err);
    }
  });

  io.sockets.on("connection", (socket) => {
    let address = socket.request.connection.remoteAddress;

    logger.info(`New Connection`, {
      address,
      id: socket.id,
    });
    socket.on("leave", (params) => {
      logger.info("leaved", {
        ...params,
        address,
        id: socket.id,
        method: "leave",
      });
      socket.leave(params.room);
    });

    socket.on("join", async (params) => {
      socket.join(params.room, {
        ...params,
      });
      logger.info("join", {
        ...params,
        address,
        id: socket.id,
        method: "join",
      });
    });
    socket.on("online-users", (cb) => {
      logger.info("online user", {
        id: socket.id,
        method: "online",
        type: typeof cb,
      });
      const newUserId = socket.user.id;
      if (!onlineUsers.some((user) => user.userId === newUserId)) {
        onlineUsers.push({ userId: newUserId, socketId: socket.id });
      }
      io.emit("get-users", onlineUsers);
      // return cb(onlineUsers);
    });

    socket.on("offline", () => {
      // remove user from active users
      onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
      // send all online users to all users
      io.emit("get-users", onlineUsers);
    });

    socket.on("disconnect", () => {
      logger.info("disconnected", {
        id: socket.id,
        method: "disconnect",
      });
      onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
      // send all online users to all users
      io.emit("get-users", onlineUsers);
    });

    socket.on("rooms", (params, cb) => {
      logger.info("Rooms", {
        id: socket.id,
        method: "rooms",
        type: typeof cb,
        params: params,
      });

      if (typeof cb === "function")
        cb({
          rooms: ["DSDsds"],
        });
    });

    socket.on("isReadNotification", async (params) => {
      logger.info("like", {
        method: "read notification",
        params: params,
      });
      try {
        if (params.profileId) {
          params["isRead"] = "Y";
          io.to(`${params.profileId}`).emit("isReadNotification_ack", params);
        }
      } catch (error) {
        return error;
      }
    });

    // Message Socket //
    socket.on("join-chat-room", async (params) => {
      socket.join(params.room, {
        ...params,
      });
      logger.info("join", {
        ...params,
        address,
        id: socket.id,
        method: "join",
      });
    });

    socket.on("get-chat-list", async (params, cb) => {
      // logger.info("get-chat", {
      //   ...params,
      //   address,
      //   id: socket.id,
      //   method: "get-chat",
      // });
      try {
        if (params) {
          const chatList = await chatService.getChatList(params);
          // for (const key in chatList) {
          //   if (Object.hasOwnProperty.call(chatList, key)) {
          //     const chat = chatList[key];
          //     socket.join(`${chat.roomId}`);
          //     console.log(socket.id);
          //   }
          // }
          if (cb) {
            // socket.emit("chat-list", chatList);
            return cb(chatList);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("check-room", async (params, cb) => {
      logger.info("join", {
        ...params,
        address,
        id: socket.id,
        method: "join",
      });
      try {
        if (params) {
          const room = await chatService.checkRoomCreated(params);
          if (cb) {
            // socket.emit("chat-list", chatList);
            return cb(room);
          } else {
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("create-room", async (params, cb) => {
      logger.info("join", {
        ...params,
        address,
        id: socket.id,
        method: "join",
      });
      try {
        if (params) {
          const data = await chatService.createChatRoom(params);
          if (data?.room) {
            // io.to(`${params.profileId2}`).emit("new-room", data.id);
            if (data?.notification) {
              if (data?.notification) {
                io.to(`${data.notification?.notificationToProfileId}`).emit(
                  "notification",
                  data?.notification
                );
              }
            }
            return cb({ room: data.room });
          } else {
            return cb({ message: "Room already created" });
          }
        }
      } catch (error) {
        cd(error);
      }
    });

    socket.on("send-message", async (params, cb) => {
      logger.info("send-message", {
        ...params,
        address,
        id: socket.id,
        method: "send-message",
      });
      try {
        if (params) {
          const data = await chatService.sendMessage(params);
          console.log("new-message", data);
          if (data.newMessage) {
            if (params?.groupId) {
              io.to(`${params.groupId}`).emit("new-message", data.newMessage);
              if (data?.notification) {
                if (data?.notification) {
                  io.to(`${params.groupId}`).emit(
                    "notification",
                    data?.notification
                  );
                }
              }
            } else {
              console.log("in=========>");
              io.to(`${params.roomId}`).emit("new-message", data.newMessage);
              if (data?.notification) {
                io.to(`${params?.roomId}`).emit(
                  "notification",
                  data?.notification
                );
              }
            }
            // if (data?.notifications) {
            //   for (const key in data?.notifications) {
            //     if (Object.hasOwnProperty.call(data?.notifications, key)) {
            //       const notification = data?.notifications[key];
            //       io.to(`${notification.notificationToProfileId}`).emit(
            //         "notification",
            //         notification
            //       );
            //     }
            //   }
            // }
            return cb(data.newMessage);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("read-message", async (params, cb) => {
      logger.info("read-message", {
        ...params,
        address,
        id: socket.id,
        method: "read-message",
      });
      try {
        if (params) {
          const data = await chatService.readMessage(params);
          // io.to(params.profileId).emit("update-message", data.ids);
          if (data) {
            return cb(data.ids);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("accept-room", async (params, cb) => {
      logger.info("read-message", {
        ...params,
        address,
        id: socket.id,
        method: "read-message",
      });
      try {
        if (params) {
          const data = await chatService.acceptRoom(params);
          if (data) {
            io.to(`${data?.notification?.notificationToProfileId}`).emit(
              "notification",
              data?.notification
            );
            io.to(`${data?.notification?.notificationToProfileId}`).emit(
              "accept-invitation",
              data?.room
            );
            return cb(data?.room);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("edit-message", async (params, cb) => {
      logger.info("edit-message", {
        ...params,
        address,
        id: socket.id,
        method: "edit-message",
      });
      try {
        if (params) {
          const data = await chatService.editMessage(params);
          if (params.groupId) {
            io.to(`${params?.groupId}`).emit("new-message", data);
          } else {
            io.to(`${params?.profileId}`).emit("new-message", data);
          }
          if (data) {
            return cb(data);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("delete-message", async (params, cb) => {
      logger.info("delete-message", {
        ...params,
        address,
        id: socket.id,
        method: "delete-message",
      });
      try {
        if (params) {
          const data = await chatService.deleteMessage(params);
          io.to(`${params?.profileId}`).emit("new-message", data);
          if (data) {
            return cb(data);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("delete-room", async (params, cb) => {
      logger.info("delete-room", {
        ...params,
        address,
        id: socket.id,
        method: "delete-room",
      });
      try {
        if (params) {
          const data = await chatService.deleteRoom(params);
          io.to(`${params?.profileId}`).emit("new-message", data);
          if (data) {
            return cb(data);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("start-call", async (params, cb) => {
      logger.info("start-call", {
        ...params,
        address,
        id: socket.id,
        method: "start-call",
      });
      try {
        if (params) {
          const data = await chatService.startCall(params);
          if (data?.notification) {
            if (params.groupId) {
              console.log("in=========>");
              io.to(`${params.groupId}`).emit("new-message", data.newMessage);
              if (data?.notification) {
                if (data?.notification) {
                  io.to(`${params.groupId}`).emit(
                    "notification",
                    data?.notification
                  );
                }
              }
            } else {
              console.log("in=========>");
              io.to(`${params.roomId}`).emit("new-message", data.newMessage);
              if (data?.notification) {
                if (data?.notification) {
                  io.to(`${params.roomId}`).emit(
                    "notification",
                    data?.notification
                  );
                }
              }
            }
            // for (const key in data?.notifications) {
            //   if (Object.hasOwnProperty.call(data?.notifications, key)) {
            //     const notification = data?.notifications[key];
            //     io.to(`${notification.notificationToProfileId}`).emit(
            //       "notification",
            //       notification
            //     );
            //   }
            // }
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("decline-call", async (params, cb) => {
      logger.info("decile-call", {
        ...params,
        address,
        id: socket.id,
        method: "decline-call",
      });
      try {
        if (params) {
          if (params?.roomId) {
            const data = await chatService.declineCall(params);
            io.to(`${params?.roomId}`).emit("notification", data);
            return cb(true);
          } else {
            io.to(`${params?.groupId}`).emit("notification", data);
            return cb(true);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("pick-up-call", async (params, cb) => {
      logger.info("pick-up-call", {
        ...params,
        address,
        id: socket.id,
        method: "pick-up-call",
      });
      try {
        if (params) {
          const data = await chatService.pickUpCall(params);
          if (params?.roomId) {
            io.to(`${params?.roomId}`).emit("notification", data);
            return cb(true);
          } else {
            io.to(`${params?.notificationToProfileId}`).emit("notification", data);
            return cb(true);
          }
        }
      } catch (error) {
        return cb(error);
      }
    });

    // Group chats //
    socket.on("create-group", async (params, cb) => {
      logger.info("create-group", {
        ...params,
        address,
        id: socket.id,
        method: "create-group",
      });
      try {
        if (params) {
          const data = await chatService.createGroups(params);
          console.log("group", data.notifications);
          if (data?.notifications) {
            for (const key in data?.notifications) {
              if (Object.hasOwnProperty.call(data?.notifications, key)) {
                const notification = data?.notifications[key];
                io.to(`${notification.notificationToProfileId}`).emit(
                  "notification",
                  notification
                );
              }
            }
          }
          return cb(data?.groupList);
        }
      } catch (error) {
        return cb(error);
      }
    });

    socket.on("get-group-list", async (params, cb) => {
      // logger.info("get-group", {
      //   ...params,
      //   address,
      //   id: socket.id,
      //   method: "get-group",
      // });
      try {
        if (params) {
          const groupList = await chatService.getGroupList(params);
          // for (const key in groupList) {
          //   if (Object.hasOwnProperty.call(groupList, key)) {
          //     const group = groupList[key];
          //     // io.to(`${group.groupId}`).emit("join", group);
          //     socket.join(`${group.groupId}`);
          //     console.log(socket.id);
          //   }
          // }
          if (cb) {
            return cb(groupList);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("get-group", async (params, cb) => {
      logger.info("get-group", {
        ...params,
        address,
        id: socket.id,
        method: "get-group",
      });
      try {
        if (params) {
          const groupList = await chatService.getGroup(params);
          if (cb) {
            return cb(groupList);
          }
        }
      } catch (error) {
        cb(error);
      }
    });

    socket.on("remove-member", async (params, cb) => {
      logger.info("remove-member", {
        ...params,
        address,
        id: socket.id,
        method: "remove-member",
      });
      try {
        if (params) {
          const groupList = await chatService.removeMember(params);
          if (cb) {
            return cb(groupList);
          }
        }
      } catch (error) {
        cb(error);
      }
    });
  });
};

module.exports = socket;
